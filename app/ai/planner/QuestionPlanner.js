export default class QuestionPlanner {
    plan({
        questions = [],
        answers = {}
    } = {}) {
        return questions.filter(
            question =>
                answers[
                    question.id
                ] === undefined
        );
    }
}
