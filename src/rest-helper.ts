import { NetworkError, ServiceError } from "./errors";

const LIB_VERSION = require('../package.json').version;

export enum ServiceType {
    Relayer = "Relayer",
    DelegatedProver = "Delegated Prover"
}

export function defaultHeaders(supportId?: string): Record<string, string> {
    if (supportId) {
      return {'content-type': 'application/json;charset=UTF-8',
              'zkbob-libjs-version': LIB_VERSION,
              'zkbob-support-id': supportId};
    }

    return {'content-type': 'application/json;charset=UTF-8',
            'zkbob-libjs-version': LIB_VERSION};
  }

// Universal response parser
export async function fetchJson(url: string, headers: RequestInit, service: ServiceType): Promise<any> {
    let response: Response;
    try {
      response = await fetch(url, headers);
    } catch(err) {
      // server is unreachable
      throw new NetworkError(err, url);
    }

    // Extract response body: json | string | null
    let responseBody: any = null;
    const contentType = response.headers.get('content-type')!;
    if (contentType === null) responseBody = null;
    else if (contentType.startsWith('application/json;')) responseBody = await response.json();
    else if (contentType.startsWith('text/plain;')) responseBody = await response.text();
    else if (contentType.startsWith('text/html;')) responseBody = (await response.text()).replace(/<[^>]+>/g, '').replace(/(?:\r\n|\r|\n)/g, ' ').replace(/^\s+|\s+$/gm,'');
    else console.warn(`Unsupported response content-type in response: ${contentType}`);

    // Unsuccess error code case (not in range 200-299)
    if (!response.ok) {
      if (responseBody === null) {
        throw new ServiceError(service, response.status, 'no description provided');  
      }

      // process string error response
      if (typeof responseBody === 'string') {
        throw new ServiceError(service, response.status, responseBody);
      }

      // process 'errors' json response
      if (Array.isArray(responseBody.errors)) {
        const errorsText = responseBody.errors.map((oneError) => {
          return `[${oneError.path}]: ${oneError.message}`;
        }).join(', ');

        throw new ServiceError(service, response.status, errorsText);
      }

      // unknown error format
      throw new ServiceError(service, response.status, contentType);
    } 

    return responseBody;
  }