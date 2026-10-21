// Trusted operator code, loaded at startup. Never take module paths from tool arguments.
import { z } from 'zod';
export function createTools(){return [{
  name:'local_echo',description:'Return a short string for adapter development.',
  schema:z.object({text:z.string().max(200)}).strict(),
  run:async({text})=>({text}),
}];}
