"""Code snippet for Sample Dataset node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    dataset = params.get("dataset", "iris")
    out = output_vars.get("dataframe_out", "df")

    if dataset == "iris":
        imports = [
            "import pandas as pd",
            "from sklearn.datasets import load_iris",
        ]
        code = (
            f'_iris = load_iris()\n'
            f'{out} = pd.DataFrame(_iris.data, columns=_iris.feature_names)\n'
            f'{out}["target"] = _iris.target\n'
        )
    elif dataset == "titanic":
        imports = ["import pandas as pd"]
        code = (
            f'# Titanic dataset — synthetic stand-in (replace with your CSV)\n'
            f'import numpy as np\n'
            f'np.random.seed(42)\n'
            f'_n = 891\n'
            f'{out} = pd.DataFrame({{\n'
            f'    "PassengerId": range(1, _n + 1),\n'
            f'    "Survived": np.random.choice([0, 1], _n, p=[0.62, 0.38]),\n'
            f'    "Pclass": np.random.choice([1, 2, 3], _n, p=[0.24, 0.21, 0.55]),\n'
            f'    "Age": np.random.normal(30, 14, _n).clip(1, 80).round(1),\n'
            f'    "Fare": np.random.exponential(32, _n).round(2),\n'
            f'}})\n'
        )
    elif dataset == "housing":
        imports = [
            "import pandas as pd",
            "from sklearn.datasets import fetch_california_housing",
        ]
        code = (
            f'_housing = fetch_california_housing()\n'
            f'{out} = pd.DataFrame(_housing.data, columns=_housing.feature_names)\n'
            f'{out}["target"] = _housing.target\n'
        )
    elif dataset == "diabetes":
        imports = [
            "import pandas as pd",
            "from sklearn.datasets import load_diabetes",
        ]
        code = (
            f'_diabetes = load_diabetes()\n'
            f'{out} = pd.DataFrame(_diabetes.data, columns=_diabetes.feature_names)\n'
            f'{out}["target"] = _diabetes.target\n'
        )
    else:
        imports = ["import pandas as pd"]
        code = f'{out} = pd.DataFrame()  # Unknown dataset: {dataset}\n'

    code += f'print(f"{label}: {{{out}.shape}}")\n'
    return imports, code
