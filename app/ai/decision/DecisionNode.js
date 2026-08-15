export default class DecisionNode {
    constructor({
        id,
        question = null,
        condition = null,
        trueNode = null,
        falseNode = null,
        result = null
    } = {}) {
        this.id = id;
        this.question = question;
        this.condition = condition;
        this.trueNode = trueNode;
        this.falseNode = falseNode;
        this.result = result;
    }
}
