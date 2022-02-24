import { redirect } from 'remix';

export async function loader() {
  return redirect('/eth');
}
