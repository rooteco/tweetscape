import {
  HtmlMetaDescriptor,
  MetaFunction,
  json as remixJson,
  useLoaderData as useRemixLoaderData,
  useMatches as useRemixMatches,
} from 'remix';
import { parse, stringify } from 'json-bigint';

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
  return remixJson(stringify(obj), init);
}

export function withSuperJSON<Data>(
  metaFn: MetaFunction
): SuperJSONMetaFunction<Data> {
  return ({ data, ...rest }: MetaArgs): HtmlMetaDescriptor =>
    metaFn({ ...rest, data: parse(data as string) as Data });
}

export function useLoaderData<Data>(): Data {
  const loaderData = useRemixLoaderData<string>();
  return parse(loaderData) as Data;
}

export function useMatches(): ReturnType<typeof useRemixMatches> {
  const matches = useRemixMatches();
  return matches.map(({ data, ...rest }) => ({
    ...rest,
    data: data ? parse(data as unknown as string) : data,
  }));
}
