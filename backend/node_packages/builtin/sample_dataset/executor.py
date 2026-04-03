"""Datasets node — loads one of the built-in sklearn/seaborn datasets."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd
    from sklearn import datasets

    dataset = parameters.get("dataset", "iris")

    if dataset == "iris":
        raw = datasets.load_iris(as_frame=True)
        df = raw.frame
        df["target_names"] = df["target"].map({i: n for i, n in enumerate(raw.target_names)})

    elif dataset == "titanic":
        # Use a realistic synthetic Titanic dataset (891 rows, matching the original)
        # Avoids slow network fetch from OpenML that can block the UI for 6+ seconds
        import numpy as np
        rng = np.random.default_rng(42)
        n = 891
        age_raw = rng.normal(30, 14, n).clip(0.5, 80).round(1)
        pclass = rng.choice([1, 2, 3], n, p=[0.24, 0.21, 0.55])
        sex = rng.choice(["male", "female"], n, p=[0.65, 0.35])
        # Survival correlates with sex and class
        surv_prob = np.where(
            sex == "female",
            np.where(pclass == 1, 0.97, np.where(pclass == 2, 0.92, 0.50)),
            np.where(pclass == 1, 0.37, np.where(pclass == 2, 0.16, 0.14)),
        )
        survived = (rng.random(n) < surv_prob).astype(int)
        fare = np.where(pclass == 1, rng.exponential(60, n), np.where(pclass == 2, rng.exponential(20, n), rng.exponential(8, n))).round(2)
        df = pd.DataFrame({
            "survived": survived,
            "pclass":   pclass,
            "sex":      sex,
            "age":      age_raw,
            "sibsp":    rng.choice([0, 1, 2, 3, 4], n, p=[0.68, 0.23, 0.05, 0.02, 0.02]),
            "parch":    rng.choice([0, 1, 2, 3], n, p=[0.76, 0.13, 0.09, 0.02]),
            "fare":     fare,
            "embarked": rng.choice(["S", "C", "Q"], n, p=[0.72, 0.19, 0.09]),
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
