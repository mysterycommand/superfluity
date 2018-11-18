// tslint:disable variable-name

export default class ContactListener {
  public static b2_defaultListener = new ContactListener();

  public BeginContact(contact: any) {} // tslint:disable-line no-empty
  public EndContact(contact: any) {} // tslint:disable-line no-empty
  public PreSolve(contact: any, oldManifold: any) {} // tslint:disable-line no-empty
  public PostSolve(contact: any, impulse: any) {} // tslint:disable-line no-empty
}
