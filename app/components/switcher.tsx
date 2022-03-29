import * as Select from '@radix-ui/react-select';
import { useLocation, useMatches, useNavigate } from 'remix';

import ExpandIcon from '~/icons/expand';
import type { LoaderData } from '~/root';

function Item(props: Select.SelectItemProps) {
  return (
    <Select.Item
      className='text-sm outline-none rounded px-1.5 py-0.5 focus:bg-gray-100 dark:focus:bg-gray-800 transition-colors cursor-pointer'
      {...props}
    />
  );
}

function Label(props: Select.SelectLabelProps) {
  return (
    <Select.Label
      className='text-xs px-1.5 pt-1.5 pb-0.5 text-gray-500'
      {...props}
    />
  );
}

export default function Switcher() {
  const root = useMatches()[0].data as LoaderData | undefined;
  const clusters = root?.clusters ?? [];
  const lists = root?.lists ?? [];
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <Select.Root value={pathname} onValueChange={navigate}>
      <Select.Trigger className='outline-none mr-1.5 flex truncate items-center text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 h-6'>
        <Select.Value />
        <Select.Icon>
          <ExpandIcon className='shrink-0 w-3.5 h-3.5 ml-1 fill-gray-500' />
        </Select.Icon>
      </Select.Trigger>
      <Select.Content className='overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-md shadow-md'>
        <Select.ScrollUpButton />
        <Select.Viewport className='p-1.5'>
          {!!clusters.length && (
            <Select.Group>
              <Label>Hive clusters</Label>
              {clusters.map((c) => (
                <Item key={c.id} value={`/clusters/${c.slug}`}>
                  <Select.ItemText>{c.name}</Select.ItemText>
                  <Select.ItemIndicator />
                </Item>
              ))}
            </Select.Group>
          )}
          <Select.Group>
            <Label>Rekt parlors</Label>
            <Item value='/rekt/crypto'>
              <Select.ItemText>Crypto</Select.ItemText>
              <Select.ItemIndicator />
            </Item>
          </Select.Group>
          {!!lists.length && (
            <Select.Group>
              <Label>Your lists</Label>
              {lists.map((l) => (
                <Item key={l.id} value={`/lists/${l.id}`}>
                  <Select.ItemText>{l.name}</Select.ItemText>
                  <Select.ItemIndicator />
                </Item>
              ))}
            </Select.Group>
          )}
        </Select.Viewport>
        <Select.ScrollDownButton />
      </Select.Content>
    </Select.Root>
  );
}
