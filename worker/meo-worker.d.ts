declare const worker: { fetch(req: Request, env: Record<string, string>): Promise<Response> };
export default worker;
