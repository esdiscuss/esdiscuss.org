import moment from 'moment';
declare class Brand<Name> {
    private readonly __brand;
}
export declare type MessageID = string & Brand<'MessageID'>;
export declare type TopicKey = string & Brand<'TopicKey'>;
export declare type TopicSlug = string & Brand<'TopicSlug'>;
interface Header {
    _id: MessageID;
    subject: string;
    from: {
        name: string;
        email: string;
    };
    reply: string;
    date: Date;
    subjectID: TopicKey;
    url: string;
    updated?: Date;
}
interface Message extends Header {
    from: {
        name: string;
        email: string;
        hash: string;
        avatar: string;
        profile: string;
    };
    edited: string;
    original: string;
    updated?: Date;
}
interface BotRunsDay {
    _id: string;
    runs: number;
}
export declare function user(email: string): Promise<{
    email: string;
    hash: string;
    avatar: string;
    profile: string;
}>;
export declare function message(id: MessageID): Promise<Message | null>;
export declare function update(id: MessageID, content: string, email: string): Promise<void>;
export declare function history(id: MessageID): Promise<{
    original: Message | null;
    edits: {
        from: {
            email: string;
            hash: string;
            avatar: string;
            profile: string;
        };
        id: MessageID;
        user: string;
    }[];
}>;
export declare function fromURL(url: string): Promise<Header | null>;
export declare function location(subjectID: string, date: Date): Promise<{
    subjectID: TopicSlug;
    messageNum: number;
}>;
export declare function topic(topicSlug: TopicSlug): Promise<Message[]>;
export declare function getNewLocation(oldSubjectID: TopicKey): Promise<TopicSlug | null>;
export declare function page(page: number, numberPerPage?: number): Promise<{
    start: moment.Moment;
    end: moment.Moment;
    _id: string;
    subjectID: string;
}[] & {
    last: boolean;
}>;
export declare function botRuns(): Promise<BotRunsDay[]>;
export declare const getAllMessagesForSearch: (start: number, limit: number) => Promise<{
    objectID: MessageID;
    subject: string;
    content: string;
    fromName: string;
    fromEmail: string;
    date: Date;
    subjectID: TopicKey;
}[]>;
export declare function getTopicFromMessageID(messageID: MessageID): Promise<TopicSlug>;
export {};
