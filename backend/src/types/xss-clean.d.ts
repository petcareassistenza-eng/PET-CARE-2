/**
 * Type declaration for xss-clean package
 * No official @types package available
 */

declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  
  function xssClean(): RequestHandler;
  
  export = xssClean;
}
