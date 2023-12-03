const ApiUrlHttp = Object.freeze({
  PROD: "https://api.hume.ai",
});

const ApiUrlWs = Object.freeze({
  PROD: "wss://api.hume.ai",
});

export enum Environment {
  Prod = "prod",
}

export function parseEnvironment(env: string): Environment {
  return Environment.Prod
}

export function getApiUrlHttp(environment: Environment): string {
  return ApiUrlHttp.PROD
}

export function getApiUrlWs(environment: Environment): string {
  return ApiUrlWs.PROD
}
