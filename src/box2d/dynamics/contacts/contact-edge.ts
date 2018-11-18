import Contact from './contact';
import Body from '../body';

export default class ContactEdge {
  public contact?: Contact;
  public prev?: ContactEdge;
  public next?: ContactEdge;
  public other?: Body;
}
