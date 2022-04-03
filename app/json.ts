import {
  HtmlMetaDescriptor,
  MetaFunction,
  json as remixJson,
  useLoaderData as useRemixLoaderData,
  useMatches as useRemixMatches,
} from 'remix';
import { deserialize, serialize } from 'superjson';
import { SuperJSONResult } from 'superjson/dist/types';

type JsonResponse = ReturnType<typeof remixJson>;
type MetaArgs = Parameters<MetaFunction>[0];
type MetaArgsSansData = Omit<MetaArgs, 'data'>;

type SuperJSONMetaFunction<Data> = {
  (args: MetaArgsSansData & { data: Data }): HtmlMetaDescriptor;
};

export function json<Data>(
  obj: Data,
  init?: number | ResponseInit
): JsonResponse {
  const superJsonResult = serialize(obj);
  return remixJson(superJsonResult, init);
}

export function parse<Data>(superJsonResult: SuperJSONResult) {
  return deserialize<Data>(superJsonResult);
}

export function withSuperJSON<Data>(
  metaFn: MetaFunction
): SuperJSONMetaFunction<Data> {
  return ({ data, ...rest }: MetaArgs): HtmlMetaDescriptor =>
    metaFn({ ...rest, data: parse<Data>(data as SuperJSONResult) });
}

export function useLoaderData<Data>(): Data {
  const loaderData = useRemixLoaderData<SuperJSONResult>();
  return parse<Data>(loaderData);
}

export function useMatches(): ReturnType<typeof useRemixMatches> {
  const matches = useRemixMatches();
  return matches.map(({ data, ...rest }) => ({
    ...rest,
    data: data ? parse(data as SuperJSONResult) : data,
  }));
}
