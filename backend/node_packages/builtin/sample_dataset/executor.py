"""Sample Dataset node — loads one of the built-in sklearn/seaborn datasets."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd
    from sklearn import datasets

    dataset = parameters.get("dataset", "iris")

    if dataset == "iris":
        raw = datasets.load_iris(as_frame=True)
        df = raw.frame
        df["target_names"] = df["target"].map({i: n for i, n in enumerate(raw.target_names)})

    elif dataset == "titanic":
        # Fetch from scikit-learn's OpenML interface (cached after first download)
        try:
            raw = datasets.fetch_openml("titanic", version=1, as_frame=True, parser="auto")
            df = raw.frame
        except Exception:
            # Fallback: minimal synthetic titanic-style DataFrame
            import numpy as np
            rng = np.random.default_rng(42)
            n = 891
            df = pd.DataFrame({
                "pclass":   rng.choice([1, 2, 3], n),
                "survived": rng.choice([0, 1], n, p=[0.62, 0.38]),
                "sex":      rng.choice(["male", "female"], n),
                "age":      rng.uniform(1, 80, n).round(1),
                "fare":     rng.exponential(30, n).round(2),
                "embarked": rng.choice(["S", "C", "Q"], n),
            })

    elif dataset == "housing":
        raw = datasets.fetch_california_housing(as_frame=True)
        df = raw.frame

    elif dataset == "diabetes":
        raw = datasets.load_diabetes(as_frame=True)
        df = raw.frame

    else:
        raise ValueError(f"Unknown dataset: {dataset!r}. Choose from: iris, titanic, housing, diabetes")

    return {"dataframe_out": df}
