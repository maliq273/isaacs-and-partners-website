import SessionMemory from "./memory/SessionMemory.js";
import ConversationMemory from "./memory/ConversationMemory.js";
import MatterMemory from "./memory/MatterMemory.js";
import KnowledgeMemory from "./memory/KnowledgeMemory.js";

export default class AIMemory {
    constructor() {
        this.session =
            new SessionMemory();

        this.conversation =
            new ConversationMemory();

        this.matter =
            new MatterMemory();

        this.knowledge =
            new KnowledgeMemory();
    }

    clear() {
        this.session.clear();
        this.conversation.clear();
        this.matter.matters.clear();
        this.knowledge.clear();
    }
}
