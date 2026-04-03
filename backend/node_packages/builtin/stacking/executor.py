"""Stacking Classifier node — combines multiple base classifiers with a meta-learner."""


def _build_estimator(name: str, random_state: int):
    """Map a string name to an sklearn estimator instance."""
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.naive_bayes import GaussianNB
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.svm import SVC
    from sklearn.tree import DecisionTreeClassifier

    estimator_map = {
        "logistic_regression": LogisticRegression(
            max_iter=1000, random_state=random_state
        ),
        "decision_tree": DecisionTreeClassifier(random_state=random_state),
        "random_forest": RandomForestClassifier(
            n_estimators=50, random_state=random_state
        ),
        "knn": KNeighborsClassifier(),
        "naive_bayes": GaussianNB(),
        "svm": SVC(probability=True, random_state=random_state),
        "gradient_boosting": GradientBoostingClassifier(random_state=random_state),
    }

    if name not in estimator_map:
        raise ValueError(f"Unknown estimator: {name}")

    return estimator_map[name]


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.ensemble import StackingClassifier

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    random_state = parameters.get("random_state", 42)

    base_names = parameters.get(
        "base_estimators", ["logistic_regression", "decision_tree", "random_forest"]
    )
    estimators = [
        (name, _build_estimator(name, random_state)) for name in base_names
    ]

    final_name = parameters.get("final_estimator", "logistic_regression")
    final_est = _build_estimator(final_name, random_state)

    model = StackingClassifier(
        estimators=estimators,
        final_estimator=final_est,
        cv=parameters.get("cv", 5),
        passthrough=parameters.get("passthrough", False),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
