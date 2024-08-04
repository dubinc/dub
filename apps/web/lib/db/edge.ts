import { nanoid, punyEncode } from "@dub/utils";
import { DATABASE_URL, getEdgeClient } from ".";

export const client = getEdgeClient();

export const getWorkspaceViaEdge = async (workspaceId: string) => {
    if (!DATABASE_URL) return null;

    const workspace = await client.project.findUnique({
        where: {
            id: workspaceId.replace("ws_", ""),
        },
    });

    return workspace;
};

export const checkIfKeyExists = async (domain: string, key: string) => {
    if (!DATABASE_URL) return null;

    const link = await client.link.findUnique({
        where: {
            domain_key: {
                domain: domain,
                key: punyEncode(decodeURIComponent(key)),
            },
        },
    });

    return link;
};

export const checkIfUserExists = async (userId: string) => {
    if (!DATABASE_URL) return null;

    const user = await client.user.findUnique({
        where: {
            id: userId,
        },
    });

    return user;
};

export const getLinkViaEdge = async (domain: string, key: string) => {
    if (!DATABASE_URL) return null;

    const link = await client.link.findUnique({
        where: {
            domain_key: {
                domain: domain,
                key: punyEncode(decodeURIComponent(key)),
            },
        },
    });

    return link;
};

export async function getRandomKey({
    domain,
    prefix,
    long,
}: {
    domain: string;
    prefix?: string;
    long?: boolean;
}): Promise<string> {
    /* recursively get random key till it gets one that's available */
    let key = long ? nanoid(69) : nanoid();
    if (prefix) {
        key = `${prefix.replace(/^\/|\/$/g, "")}/${key}`;
    }
    const exists = await checkIfKeyExists(domain, key);
    if (exists) {
        // by the off chance that key already exists
        return getRandomKey({ domain, prefix, long });
    } else {
        return key;
    }
}
