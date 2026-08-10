/**
 * Isaacs & Partners
 * API Client
 *
 * Centralised HTTP/API communication layer.
 *
 * Design goals:
 * - No direct fetch() calls scattered through the application.
 * - Consistent authentication headers.
 * - Consistent error handling.
 * - JSON and file upload support.
 * - Request timeout protection.
 * - Automatic correlation/request IDs.
 */

import { generateId, isObject } from "./utils.js";

const DEFAULT_TIMEOUT = 30000;

class ApiError extends Error {
    constructor(message, options = {}) {
        super(message);

        this.name = "ApiError";
        this.status = options.status ?? null;
        this.code = options.code ?? null;
        this.data = options.data ?? null;
        this.requestId = options.requestId ?? null;
        this.url = options.url ?? null;
    }
}

class ApiClient {
    constructor(options = {}) {
        this.baseUrl = this.normaliseBaseUrl(
            options.baseUrl ||
                document.documentElement.dataset.apiBase ||
                "/api"
        );

        this.timeout =
            options.timeout ?? DEFAULT_TIMEOUT;

        this.tokenProvider =
            options.tokenProvider ||
            (() => {
                try {
                    return (
                        sessionStorage.getItem(
                            "auth_token"
                        ) ||
                        localStorage.getItem(
                            "auth_token"
                        )
                    );
                } catch {
                    return null;
                }
            });

        this.defaultHeaders = {
            Accept: "application/json",
            ...(options.headers || {})
        };
    }

    normaliseBaseUrl(url) {
        return String(url || "").replace(/\/+$/, "");
    }

    buildUrl(path) {
        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        const cleanPath = String(path)
            .replace(/^\/+/, "");

        return `${this.baseUrl}/${cleanPath}`;
    }

    getHeaders(options = {}) {
        const headers = {
            ...this.defaultHeaders,
            ...(options.headers || {})
        };

        const token =
            options.token !== undefined
                ? options.token
                : this.tokenProvider();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const requestId =
            options.requestId ||
            generateId("req");

        headers["X-Request-ID"] = requestId;

        return {
            headers,
            requestId
        };
    }

    async request(path, options = {}) {
        const url = this.buildUrl(path);

        const {
            headers,
            requestId
        } = this.getHeaders(options);

        const controller =
            new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            options.timeout ?? this.timeout
        );

        let response;

        try {
            response = await fetch(url, {
                method:
                    options.method || "GET",

                headers,

                body:
                    options.body instanceof FormData ||
                    typeof options.body === "string"
                        ? options.body
                        : options.body === undefined
                        ? undefined
                        : JSON.stringify(
                              options.body
                          ),

                credentials:
                    options.credentials ||
                    "same-origin",

                signal: controller.signal
            });
        } catch (error) {
            clearTimeout(timeout);

            if (error.name === "AbortError") {
                throw new ApiError(
                    "Request timed out",
                    {
                        code: "REQUEST_TIMEOUT",
                        requestId,
                        url
                    }
                );
            }

            throw new ApiError(
                "Unable to connect to the server",
                {
                    code: "NETWORK_ERROR",
                    requestId,
                    url,
                    data: error
                }
            );
        }

        clearTimeout(timeout);

        const data =
            await this.parseResponse(
                response
            );

        if (!response.ok) {
            throw new ApiError(
                this.extractErrorMessage(data) ||
                    `Request failed with status ${response.status}`,
                {
                    status: response.status,
                    code:
                        data?.code ||
                        `HTTP_${response.status}`,
                    data,
                    requestId,
                    url
                }
            );
        }

        return data;
    }

    async parseResponse(response) {
        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            return response.json();
        }

        if (
            contentType.includes(
                "application/pdf"
            ) ||
            contentType.includes(
                "application/octet-stream"
            )
        ) {
            return response.blob();
        }

        const text = await response.text();

        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    extractErrorMessage(data) {
        if (!data) {
            return null;
        }

        if (typeof data === "string") {
            return data;
        }

        return (
            data.message ||
            data.error ||
            data.detail ||
            null
        );
    }

    get(path, options = {}) {
        return this.request(path, {
            ...options,
            method: "GET"
        });
    }

    post(path, body, options = {}) {
        return this.request(path, {
            ...options,
            method: "POST",
            body
        });
    }

    put(path, body, options = {}) {
        return this.request(path, {
            ...options,
            method: "PUT",
            body
        });
    }

    patch(path, body, options = {}) {
        return this.request(path, {
            ...options,
            method: "PATCH",
            body
        });
    }

    delete(path, options = {}) {
        return this.request(path, {
            ...options,
            method: "DELETE"
        });
    }

    upload(
        path,
        file,
        fields = {},
        options = {}
    ) {
        const formData = new FormData();

        if (file) {
            formData.append(
                options.fileField || "file",
                file
            );
        }

        Object.entries(fields).forEach(
            ([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null
                ) {
                    formData.append(
                        key,
                        value
                    );
                }
            }
        );

        const headers = {
            ...(options.headers || {})
        };

        /*
         * Do not manually set Content-Type.
         * The browser must generate the multipart
         * boundary.
         */
        delete headers["Content-Type"];

        return this.request(path, {
            ...options,
            method: "POST",
            body: formData,
            headers
        });
    }

    isApiError(error) {
        return error instanceof ApiError;
    }
}

export const api = new ApiClient();

export {
    ApiClient,
    ApiError
};

export default api;
