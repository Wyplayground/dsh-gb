"""One-shot, isolated setup. Never installs into the user's system Python."""
import argparse
import json
from pathlib import Path
import subprocess
import sys


def run(argv):
    subprocess.run(list(map(str, argv)), check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', required=True, type=Path)
    parser.add_argument('--install-deps', action='store_true', help='Explicitly create an isolated venv and install pinned GB requirements.')
    parser.add_argument('--check', action='store_true', help='Read-only environment check, no downloads or installation.')
    args = parser.parse_args()
    if not (3, 10) <= sys.version_info[:2] <= (3, 13):
        parser.error('Use Python 3.10 through 3.13 for this GB release.')
    workspace = args.workspace.expanduser().resolve()
    runtime = workspace / '.dsh-gb' / 'runtime'
    gb = runtime / 'gb'
    environment = runtime / 'venv'
    python = environment / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
    lock = json.loads((Path(__file__).resolve().parents[1] / 'gb.lock.json').read_text())
    if not args.check:
        if not args.install_deps:
            parser.error('Use --install-deps to create a private environment, or --check for a read-only check.')
        workspace.mkdir(parents=True, exist_ok=True)
        runtime.mkdir(parents=True, exist_ok=True)
        # Refuse symlink redirection of managed storage.
        if not runtime.resolve().is_relative_to(workspace) or runtime.is_symlink():
            raise ValueError('Managed runtime must stay inside the selected workspace.')
        for child in (gb, environment):
            if child.is_symlink() or not child.resolve().is_relative_to(runtime.resolve()):
                raise ValueError('Managed engine/environment cannot redirect outside the runtime.')
        if not gb.exists():
            run(['git', 'clone', '--no-checkout', lock['repository'], gb])
        else:
            origin = subprocess.check_output(['git', '-C', str(gb), 'remote', 'get-url', 'origin'], text=True).strip()
            if origin != lock['repository']:
                raise ValueError('Managed GB directory has a different origin; refusing to replace it.')
            changes = subprocess.check_output(['git', '-C', str(gb), 'status', '--porcelain'], text=True)
            if changes:
                raise ValueError('Managed GB checkout has local changes; refusing to replace them.')
        run(['git', '-C', gb, 'checkout', '--detach', lock['commit']])
        if not python.exists():
            run([sys.executable, '-m', 'venv', environment])
        if not python.resolve().is_relative_to(environment.resolve()):
            # POSIX venv binaries normally link to the base Python; pyvenv.cfg still proves isolation.
            if sys.platform == 'win32' or not (environment / 'pyvenv.cfg').is_file():
                raise ValueError('Interpreter must belong to the managed environment.')
        run([python, '-m', 'pip', 'install', '-r', gb / 'requirements.txt'])
    if not python.is_file() or not (gb / 'gb_core').is_dir():
        raise SystemExit('Environment is incomplete. Run with --install-deps first.')
    probe = 'import sys;sys.path.insert(0,sys.argv[1]);from gb_core.contracts import RunConfig;from gb_core.artifacts import dependency_versions;import json;print(json.dumps(dependency_versions()))'
    run([python, '-c', probe, gb])
    config = dict(pythonPath=str(python), gbRoot=str(gb), workspaceRoot=str(workspace))
    if not args.check:
        (runtime / 'setup.json').write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding='utf-8')
    print('\nSetup ready. In Harness Plugins > gb configuration, save these values:')
    print(json.dumps(config, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
