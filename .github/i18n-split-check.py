"""Verification only: keep commands, exit codes and complete logs per exact SHA."""
import json
import os
import pathlib
import re
import subprocess
import sys
import time

ROOT = pathlib.Path.cwd()
FRONTEND = ROOT / 'frontend'
NAME = os.environ['SPLIT_NAME']
OUT = pathlib.Path(os.environ['RUNNER_TEMP']) / ('split-check-' + NAME)
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = '84b9b95da4e2ba4285c6b3b8b6ceb0af7897eaea'
BASE = '7753f9f7c725077a142e5751f48c2686c7321f75'
SHA = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
assert SHA == os.environ['SPLIT_SHA']
results = []
ansi = re.compile(r'\x1b\[[0-9;]*m')

def run(name, args, cwd=FRONTEND, gating=True, timeout=600):
    start = time.monotonic()
    log = OUT / (name.replace(':', '-') + '.log')
    with log.open('w') as f:
        try:
            p = subprocess.run(args, cwd=cwd, stdout=f, stderr=subprocess.STDOUT,
                               timeout=timeout, check=False)
            code = p.returncode
        except subprocess.TimeoutExpired:
            code = 124
            f.write('\nVERIFICATION TIMEOUT\n')
    content = ansi.sub('', log.read_text(errors='replace'))
    item = {'name': name, 'command': args, 'exit_code': code, 'gating': gating,
            'seconds': round(time.monotonic()-start, 2), 'log': log.name}
    item['summary'] = [line.strip() for line in content.splitlines()
                       if re.search(r'Test Files|Tests\s+\d|# (tests|pass|fail|skipped)|Every literal key|All files\s*\|', line)]
    if name == 'expanded-test-typecheck':
        item['diagnostic_count'] = len(re.findall(r'error TS\d+:', content))
    results.append(item)
    print('CHECK', NAME, json.dumps(item), flush=True)
    if code:
        print('FAILURE_LOG', name, '\n' + '\n'.join(content.splitlines()[:65]), flush=True)
    (OUT/'results.json').write_text(json.dumps({'name':NAME,'sha':SHA,'checks':results},indent=2)+'\n')
    return code

for command in ['i18n:check', 'i18n:keys', 'test:i18n', 'typecheck', 'test:unit', 'lint', 'build']:
    run(command, ['npm', 'run', command])

parent = BASE if NAME in ('source','base') else SHA + '^'
run('diff-check', ['git','diff','--check',parent,SHA,'--','frontend/'], cwd=ROOT)

# Deliberately separate from existing project gates: the production tsconfig
# excludes tests. Report pre-existing diagnostic debt instead of hiding it.
changed = subprocess.check_output(['git','diff','--name-only',BASE,SOURCE],text=True).splitlines()
tests = [p[len('frontend/'):] for p in changed
         if p.startswith('frontend/') and ('/__tests__/' in p or '.test.' in p)
         and p.endswith(('.ts','.tsx')) and (ROOT/p).exists()]
config = FRONTEND/'tsconfig.split-verification.json'
assert not config.exists()
if tests:
    config.write_text(json.dumps({'extends':'./tsconfig.json',
        'compilerOptions':{'incremental':False}, 'include':tests,
        'exclude':['node_modules']},indent=2)+'\n')
    try:
        run('expanded-test-typecheck', ['node','node_modules/typescript/bin/tsc',
            '--noEmit','--pretty','false','-p',config.name],gating=False)
    finally:
        config.unlink()

if NAME in ('source','07-knowledge-upload-preview'):
    run('test:unit:coverage',['npm','run','test:unit:coverage'])

# Build output may be untracked, but source/config files may not be modified.
run('tracked-source-unchanged',['git','diff','--exit-code','HEAD','--','frontend/'],cwd=ROOT)
report = {'name':NAME,'sha':SHA,'checks':results,
          'standard_checks_passed':all(c['exit_code']==0 for c in results if c['gating']),
          'expanded_test_typecheck_passed':all(c['exit_code']==0 for c in results if not c['gating']),
          'browser_e2e':'not run: no configured live backend or test account'}
(OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print('VERIFICATION_SUMMARY',json.dumps(report),flush=True)
with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:
    f.write(f'## {NAME}\n\nExact commit: `{SHA}`\n\n| Check | Exit | Gate |\n|---|---:|---|\n')
    for c in results: f.write(f'| {c["name"]} | {c["exit_code"]} | {c["gating"]} |\n')
sys.exit(0 if report['standard_checks_passed'] else 1)
