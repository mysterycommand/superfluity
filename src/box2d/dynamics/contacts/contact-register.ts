import Contact from './contact';

export default class ContactRegister {
  public createFn?: (allocator: any) => Contact;
  public destroyFn?: (contact: Contact, allocator: any) => void;
  public primary?: boolean;
  public pool?: Contact;
  public poolCount = 0;
}
