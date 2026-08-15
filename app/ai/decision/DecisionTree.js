export default class DecisionTree {
    constructor(root = null) {
        this.root = root;
    }

    setRoot(node) {
        this.root = node;
        return this;
    }

    getRoot() {
        return this.root;
    }
}
