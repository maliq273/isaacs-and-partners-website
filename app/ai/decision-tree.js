import DecisionTree from "./decision/DecisionTree.js";
import DecisionNode from "./decision/DecisionNode.js";

export function createDecisionTree(
    definition = {}
) {
    const build = node => {
        if (!node) {
            return null;
        }

        return new DecisionNode({
            id: node.id,
            question:
                node.question,
            condition:
                node.condition,
            trueNode:
                build(node.trueNode),
            falseNode:
                build(node.falseNode),
            result:
                node.result
        });
    };

    return new DecisionTree(
        build(definition)
    );
}

export default createDecisionTree;
