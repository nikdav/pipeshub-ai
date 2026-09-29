"""Rebuild the frozen frontend diff as dependency-ordered, lossless commits.
Run only in a disposable checkout. Never updates an existing remote branch.
"""
import collections
import json
import os
import pathlib
import re
import subprocess

SOURCE = '84b9b95da4e2ba4285c6b3b8b6ceb0af7897eaea'
BASE = '7753f9f7c725077a142e5751f48c2686c7321f75'
UPSTREAM = '9a0488639d80bf9fcbd643035857ada8cf5363dd'
NAMES = ['core-feedback', 'shared-ui', 'auth-onboarding', 'workspace-admin',
         'connectors-web-search', 'chat-agents-projects', 'knowledge-upload-preview']
TITLES = ['introduce localized feedback descriptors and checks',
          'localize shared UI controls and display formatters',
          'localize authentication and onboarding feedback',
          'localize workspace administration and skill editing',
          'localize connector configuration and web-search settings',
          'localize chat, agent and project interfaces',
          'localize collections, uploads and file previews']
ROOT = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ.get('SPLIT_OUTPUT', '/tmp/i18n-split-output'))
OUT.mkdir(parents=True, exist_ok=True)

def git(*args, data=None, cwd=ROOT, check=True):
    p = subprocess.run(['git', *args], input=data, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, cwd=cwd, check=False)
    if check and p.returncode:
        raise RuntimeError(f'git {args}: {p.stderr.decode(errors="replace")}')
    return p.stdout if check else p

def text(*args, **kw): return git(*args, **kw).decode()
def blob(ref, path): return git('show', f'{ref}:{path}')
def catalog(p): return p.startswith('frontend/lib/i18n/locales/') and p.endswith('.json')
def is_test(p): return '/__tests__/' in p or '.test.' in p

def owner(p):
    if p.startswith('frontend/scripts/check-i18n-'): return 1
    if p.startswith('frontend/lib/i18n/'): return 1
    if p == 'frontend/lib/api/user-account-api-error.ts': return 3
    if p.startswith('frontend/lib/api/'): return 1
    if p == 'frontend/lib/store/toast-store.ts': return 1
    if p == 'frontend/lib/store/upload-store.ts': return 1
    if p.startswith('frontend/app/components/feedback/'): return 1
    if p == 'frontend/lib/utils/upload-failure-feedback.ts': return 7
    if p.startswith('frontend/lib/'): return 2
    if '/app/(main)/connectors/oauth/' in p or '/app/(public)/connectors/oauth/' in p: return 5
    if '/app/(public)/' in p or '/onboarding/' in p or '/app/(main)/components/' in p: return 3
    if '/workspace/components/' in p: return 2
    if '/workspace/connectors/' in p or '/workspace/web-search/' in p: return 5
    if '/workspace/' in p or '/components/team/' in p: return 4
    if '/chat/' in p or '/agents/' in p or '/projects/' in p: return 6
    if '/knowledge-base/' in p or '/record/' in p or '/file-preview/' in p or '/indexing-stats/' in p or p.endswith('upload-progress-tracker.tsx'): return 7
    if p.startswith('frontend/app/'): return 2
    raise ValueError('Unclassified path: '+p)

remote_url = text('remote', 'get-url', 'origin').strip().removesuffix('.git').rstrip('/')
assert remote_url == 'https://github.com/nikdav/pipeshub-ai', remote_url
assert os.environ.get('GITHUB_REPOSITORY', 'nikdav/pipeshub-ai') == 'nikdav/pipeshub-ai'
changed = text('diff', '--name-only', '--no-renames', BASE, SOURCE).splitlines()
assert changed and all(p.startswith('frontend/') for p in changed)
files = text('ls-tree', '-r', '--name-only', SOURCE, '--', 'frontend/').splitlines()
file_set = set(files)
raw = {p: blob(SOURCE, p) for p in changed if p in file_set}
assign = {p: owner(p) for p in changed if not catalog(p)}
assign['frontend/app/(main)/chat/sidebar/chat-section-header.tsx'] = 2
assign['frontend/app/components/__tests__/shared-ui-i18n.test.tsx'] = 2

aliases = [('@/chat/', 'frontend/app/(main)/chat/'),
           ('@/knowledge-base/', 'frontend/app/(main)/knowledge-base/'),
           ('@/workspace/', 'frontend/app/(main)/workspace/'), ('@/', 'frontend/')]
def resolve(path, spec):
    if spec.startswith('.'):
        target = os.path.normpath(str(pathlib.PurePosixPath(path).parent / spec))
    else:
        target = None
        for prefix, dest in aliases:
            if spec.startswith(prefix): target = dest + spec[len(prefix):]; break
        if target is None: return None
    for suffix in ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx']:
        if target + suffix in file_set: return target + suffix
    return None

for _ in range(len(assign)):
    adjusted = False
    for p in assign:
        if not is_test(p) or p not in raw: continue
        s = raw[p].decode()
        for spec in re.findall(r'''(?:from\s*|import\s*\(|vi\.mock\s*\()\s*['"]([^'"]+)['"]''', s):
            dependency = resolve(p, spec)
            if dependency in assign and assign[p] < assign[dependency]:
                assign[p] = assign[dependency]; adjusted = True
    if not adjusted: break

def flat(obj, path=()):
    if isinstance(obj, dict):
        return {p: value for key, child in obj.items() for p, value in flat(child, path+(key,)).items()}
    return {path: obj}

def logical(path):
    return '.'.join(path[:-1]+(re.sub(r'_(zero|one|two|few|many|other)$','',path[-1]),))

def default_key_owner(key):
    if key.startswith(('common.errors.', 'uploadProgress.errors.')): return 1
    if key.startswith(('auth.', 'resetPassword.', 'onboarding.', 'profile.fullNameDialog.')): return 3
    if key.startswith(('workspace.connectors.', 'workspace.webSearch.', 'connectors.oauthCallback.')): return 5
    if key.startswith(('workspace.selector.', 'workspace.form.', 'workspace.members.', 'workspace.pagination.', 'workspace.avatar.', 'workspace.entities.', 'workspace.settings.', 'workspace.tagInput.')): return 2
    if key.startswith('workspace.'): return 4
    if key.startswith(('chat.', 'chatStream.', 'agentBuilder.', 'projects.')): return 6
    if key.startswith(('filePreview.', 'knowledgeBase.', 'recordView.', 'uploadProgress.', 'collections.', 'dialog.', 'kb.')): return 7
    return 2

catalogues = {}
logical_keys = set()
for p in changed:
    if not catalog(p): continue
    before, after = json.loads(blob(BASE,p)), json.loads(raw[p])
    bf, af = flat(before), flat(after)
    assert bf.keys() <= af.keys(), 'Catalogue deletions require explicit migration: '+p
    delta = {k: v for k,v in af.items() if k not in bf or bf[k] != v}
    logical_keys.update(map(logical,delta))
    assert raw[p] == (json.dumps(after,ensure_ascii=False,indent=2)+'\n').encode(), p
    catalogues[p] = (before,after,bf,af,delta)

key_owners = {key: default_key_owner(key) for key in logical_keys}
key_references = collections.defaultdict(list)
for p, stage in assign.items():
    if p not in raw or not p.endswith(('.ts','.tsx','.js','.mjs')): continue
    s = raw[p].decode()
    literals = set(re.findall(r'''['"]([A-Za-z][\w.-]*(?:\.[\w.-]+)+)['"]''',s))
    templates = re.findall(r'`([^`]+)`',s)
    patterns=[]
    for v in templates:
        if '${' not in v: continue
        parts=re.split(r'\$\{[^}]*\}',v)
        if not re.match(r'^[A-Za-z][\w.-]*\.',parts[0]): continue
        patterns.append(re.compile('^' + '.+'.join(map(re.escape,parts)) + '$'))
    for key in logical_keys:
        if key in literals or any(re.sub(r'_(zero|one|two|few|many|other)$','',v)==key for v in literals) or any(pattern.fullmatch(key) for pattern in patterns):
            key_references[key].append((stage,p))
for key, refs in key_references.items():
    key_owners[key] = min(stage for stage,_ in refs)

ABSENT = object()
def partial(before, after, stage, prefix=()):
    if isinstance(after, dict):
        result={}
        old = before if isinstance(before,dict) else {}
        for k,v in after.items():
            child = partial(old.get(k,ABSENT),v,stage,prefix+(k,))
            if child is not ABSENT: result[k]=child
        return result if result or before is not ABSENT else ABSENT
    if before is not ABSENT and before == after: return after
    return after if key_owners[logical(prefix)] <= stage else before

worktree = OUT/'worktree'
if worktree.exists(): raise RuntimeError('Output worktree already exists')
git('worktree','add','--detach',str(worktree),BASE)
env = os.environ.copy()
env.update({'GIT_AUTHOR_NAME':'Niklas','GIT_AUTHOR_EMAIL':'55577205+nikdav@users.noreply.github.com',
            'GIT_COMMITTER_NAME':'Niklas','GIT_COMMITTER_EMAIL':'55577205+nikdav@users.noreply.github.com'})
previous=BASE
stages=[]
for stage, (name,title) in enumerate(zip(NAMES,TITLES),1):
    selected=sorted(p for p,n in assign.items() if n==stage)
    for p in selected:
        target=worktree/p
        if p in raw:
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(raw[p])
        elif target.exists(): target.unlink()
    for p,(before,after,_,_,_) in catalogues.items():
        target=worktree/p
        target.write_text(json.dumps(partial(before,after,stage),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    git('add','--all','--','frontend/',cwd=worktree)
    tree=text('write-tree',cwd=worktree).strip()
    message=f'fix(i18n): {title}\n\nSplit {stage}/7 of frozen frontend audit {SOURCE[:12]}.\nIncludes the associated translations and tests.\n'
    commit=subprocess.check_output(['git','commit-tree',tree,'-p',previous],input=message.encode(),env=env,cwd=worktree).decode().strip()
    git('reset','--soft',commit,cwd=worktree)
    actual=text('diff','--name-only',previous,commit).splitlines()
    assert all(p.startswith('frontend/') for p in actual)
    stats=collections.defaultdict(lambda: {'files':0,'added':0,'deleted':0})
    for row in text('diff','--numstat',previous,commit).splitlines():
        a,d,p=row.split('\t',2)
        cat='catalogues' if catalog(p) else 'tests' if is_test(p) else 'code'
        stats[cat]['files']+=1; stats[cat]['added']+=int(a); stats[cat]['deleted']+=int(d)
    whitespace=git('diff','--check',previous,commit,check=False)
    item={'stage':stage,'name':name,'branch':f'split/i18n-{stage:02d}-{name}',
          'base':previous,'sha':commit,'tree':tree,'files':actual,'stats':dict(stats),
          'whitespace_exit':whitespace.returncode,'whitespace_output':whitespace.stdout.decode()}
    stages.append(item)
    print('STAGE',json.dumps(item),flush=True)
    previous=commit
assert text('rev-parse',SOURCE+'^{tree}').strip() == stages[-1]['tree'], 'Final tree is not byte-identical to the source'
assert not text('diff','--name-only',SOURCE,previous)
report={'source':SOURCE,'base':BASE,'upstream_checked':UPSTREAM,'file_count':len(changed),
        'assignments':assign,'key_owners':key_owners,'stages':stages,'final_tree_equal':True}
(OUT/'split-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
candidate='verify/i18n-split-candidate-'+os.environ.get('GITHUB_RUN_ID','local')
refs=[candidate,'archive/i18n-before-split-20260929']
for ref in refs:
    remote=text('ls-remote','--heads','origin',ref).strip()
    if remote and not (ref.startswith('archive/') and remote.split()[0]==SOURCE):
        raise RuntimeError('Remote ref exists; refusing to overwrite: '+ref)
git('push','--atomic','origin',previous+':refs/heads/'+candidate,SOURCE+':refs/heads/'+refs[1])
assert text('ls-remote','--heads','origin',candidate).split()[0]==previous
print('FINAL_TREE_EQUAL',stages[-1]['tree'],flush=True)
print('CANDIDATE',candidate,previous,flush=True)
matrix={'include':[{'name':'source','sha':SOURCE},{'name':'base','sha':BASE}]+[{'name':f'{s["stage"]:02d}-{s["name"]}','sha':s['sha']} for s in stages]}
if os.getenv('GITHUB_OUTPUT'):
    with open(os.environ['GITHUB_OUTPUT'],'a') as f:
        f.write('matrix='+json.dumps(matrix,separators=(',',':'))+'\n')
