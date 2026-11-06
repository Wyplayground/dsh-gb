"""Local acceptance against authorized project inputs; original files are read-only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
os.environ['MPLBACKEND'] = 'Agg'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['OPENBLAS_NUM_THREADS'] = '1'
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'python'))
sys.path.insert(0, str(ROOT / '.runtime' / 'gb'))
from worker import dispatch
from gb_core.contracts import TaskType, RunConfig, enumerate_specs
from gb_core.data import load_dataset, split_dataset
from gb_core.engine import EvaluationEngine
import pandas as pd


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-root', required=True, type=Path)
    args = parser.parse_args()
    workspace = ROOT / '.runtime' / 'real-data-acceptance'
    workspace.mkdir(parents=True, exist_ok=True)
    records = []
    common = dict(workspaceRoot=str(workspace), gbRoot=str(ROOT / '.runtime' / 'gb'), scope='real-data')
    cases = [('bread', 'regression', 'manuscripts/Analytica Chimica Acta v2.5/Supporting_Data/05_bread_days_regression/input/bread_days_regression.csv'),
             ('fish', 'regression', 'manuscripts/Analytica Chimica Acta v2.5/Supporting_Data/03_fish_water_regression/input/fish_water_regression.csv'),
             ('olive', 'classification', 'archives/run-data/The_Innovation_v2.3_SI_v3/benchmark_inputs/olive_classification.csv')]
    for name, task_name, relative in cases:
        source = (args.data_root / relative).resolve(strict=True)
        if not source.is_relative_to(args.data_root.resolve()):
            raise ValueError('Input must stay in the authorized data root.')
        before = sha(source)
        copied = workspace / (name + '.csv')
        shutil.copyfile(source, copied)
        call = lambda op, values: dispatch({**common, 'op': op, 'args': values})
        info = call('inspect', dict(task=task_name, path=str(copied)))
        plan = call('plan', dict(task=task_name, path=str(copied), preprocessing=['Raw', 'SNV'], jobs=1))
        result = call('run', dict(plan_id=plan['plan_id']))
        saved = call('results', dict(plan_id=plan['plan_id']))
        direct_dir = workspace / ('direct-' + name)
        config = RunConfig(**plan['settings'], output_dir=direct_dir)
        task = TaskType(task_name)
        direct = EvaluationEngine(split_dataset(load_dataset(copied, task), config), config).run(enumerate_specs(task, **plan['methods'], seed=config.random_state))
        actual = pd.read_csv(saved['artifacts']['leaderboard_v3.csv'])
        for column in direct.results:
            if column.startswith(('CV_', 'Val_', 'Cal_')) and pd.api.types.is_numeric_dtype(direct.results[column]):
                pd.testing.assert_series_equal(actual[column], direct.results[column].reset_index(drop=True), check_dtype=False, rtol=1e-10, atol=1e-10)
        if sha(source) != before:
            raise ValueError('Original input changed unexpectedly.')
        record = dict(dataset=name, source_relative_path=relative, source_sha256=before, original_unchanged=True,
                      samples=info['samples'], features=info['features'], groups=info['groups'], explicit_split=info['explicit_split'],
                      plan_id=plan['plan_id'], status=result['state']['status'], summary=saved['summary'], direct_GB_metrics_match=True)
        records.append(record)
        (ROOT / '.runtime' / 'real-data-acceptance.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({k:v for k,v in record.items() if k!='summary'},ensure_ascii=False),flush=True)


if __name__ == '__main__':
    main()
