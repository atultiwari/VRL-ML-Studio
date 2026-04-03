"""Code snippet for Stacking Classifier node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    base_names = params.get(
        "base_estimators", ["logistic_regression", "decision_tree", "random_forest"]
    )
    final_name = params.get("final_estimator", "logistic_regression")
    cv = params.get("cv", 5)
    passthrough = params.get("passthrough", False)
    random_state = params.get("random_state", 42)

    imports = [
        "from sklearn.ensemble import StackingClassifier",
    ]

    name_to_import = {
        "logistic_regression": "from sklearn.linear_model import LogisticRegression",
        "decision_tree": "from sklearn.tree import DecisionTreeClassifier",
        "random_forest": "from sklearn.ensemble import RandomForestClassifier",
        "knn": "from sklearn.neighbors import KNeighborsClassifier",
        "naive_bayes": "from sklearn.naive_bayes import GaussianNB",
        "svm": "from sklearn.svm import SVC",
        "gradient_boosting": "from sklearn.ensemble import GradientBoostingClassifier",
    }

    name_to_constructor = {
        "logistic_regression": f"LogisticRegression(max_iter=1000, random_state={random_state})",
        "decision_tree": f"DecisionTreeClassifier(random_state={random_state})",
        "random_forest": f"RandomForestClassifier(n_estimators=50, random_state={random_state})",
        "knn": "KNeighborsClassifier()",
        "naive_bayes": "GaussianNB()",
        "svm": f"SVC(probability=True, random_state={random_state})",
        "gradient_boosting": f"GradientBoostingClassifier(random_state={random_state})",
    }

    all_names = set(base_names) | {final_name}
    for name in sorted(all_names):
        if name in name_to_import:
            imports.append(name_to_import[name])

    estimators_lines = ", ".join(
        f'("{n}", {name_to_constructor[n]})' for n in base_names
    )
    final_constructor = name_to_constructor[final_name]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'estimators = [{estimators_lines}]\n'
        f'{model_out} = StackingClassifier(estimators=estimators, '
        f'final_estimator={final_constructor}, cv={cv}, passthrough={passthrough})\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
