import { Member } from '../types';
import { JSDOM } from 'jsdom';
import cachedFetchContent from './cachedFetch';
import { parse } from 'querystring';
import { NICKNAME_WIKI_URL } from './settings';

export type NameAndNicknames = Pick<Member, 'name' | 'nicknames'>;
const getNicknamesFromTD = (
  td: HTMLTableDataCellElement
): Member['nicknames'] => {
  td.querySelectorAll('a').forEach((a) => a.remove());
  const text = td.textContent;
  if (text === null) return [];
  const spliter = /[、→\/,]/;

  return text
    .replace(/\(.*\)/, '')
    .replace(/（.*）/, '')
    .replace(/[ 　]/g, '')
    .split(spliter)
    .filter((x) => x !== '')
    .filter((x) => x.length < 15);
};

const parseRow = (row: HTMLTableRowElement): NameAndNicknames | null => {
  const name_tableheader = row.querySelector('th');
  if (name_tableheader === null) return null;
  const name = name_tableheader.textContent;
  if (name === null) return null;

  const nicknames_tabledata = row.querySelector('td');
  if (nicknames_tabledata === null) return null;

  return { name, nicknames: getNicknamesFromTD(nicknames_tabledata) };
};

const parseTable = (table: HTMLTableElement): NameAndNicknames[] => {
  const rows: HTMLTableRowElement[] = Array.from(table.querySelectorAll('tr'));
  const target_rows: HTMLTableRowElement[] = rows.slice(1);
  return target_rows
    .map(parseRow)
    .filter((x): x is NameAndNicknames => x !== null);
};

export const fetchNameAndNicknames = async (): Promise<NameAndNicknames[]> => {
  const dom = new JSDOM(await cachedFetchContent(NICKNAME_WIKI_URL));
  const document = dom.window.document;

  const tables = document.querySelectorAll('div.h-scrollable');
  const name_and_nicknames_array = Array.from(tables)
    .map((x) => parseTable(x as HTMLTableElement))
    .reduce((s, x) => [...s, ...x]);

  let nicknames_map: { [key: string]: Set<string> } = {};
  name_and_nicknames_array.forEach((x) => {
    nicknames_map[x.name] = new Set([]);
  });
  name_and_nicknames_array.forEach((x) => {
    const target_map = nicknames_map[x.name];
    x.nicknames.forEach((x) => {
      target_map.add(x);
    });
  });

  return Object.keys(nicknames_map).map((x) => ({
    name: x,
    nicknames: Array.from(nicknames_map[x]).filter((y) => y !== x),
  }));
};

export default fetchNameAndNicknames;
