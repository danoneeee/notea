import { createPromiseClient } from '@bufbuild/connect';
import { Timestamp } from '@bufbuild/protobuf';
import {
  DeleteTeaNoteRequest,
  GetTeaNoteRequest,
  ListTeaNotesRequest,
  NoteRatingsMsg,
  TeaNote,
  UpsertTeaNoteRequest,
} from '../generated/teanotes/v1/tea_notes_pb';
import { TeaNotesService } from '../generated/teanotes/v1/tea_notes_connect';
import { apiTransport } from './apiTransport';
import type { NoteRecord } from './notes';

const client = createPromiseClient(TeaNotesService, apiTransport);

export function noteRecordToTeaNote(record: NoteRecord): TeaNote {
  const ratings = new NoteRatingsMsg({
    aroma: record.ratings.aroma,
    taste: record.ratings.taste,
    aftertaste: record.ratings.aftertaste,
    balance: record.ratings.balance,
  });
  const updatedAt = Timestamp.fromDate(new Date(record.updatedAt));
  const harvestYear =
    record.harvestYear === null || record.harvestYear === undefined ? undefined : Number(record.harvestYear);
  return new TeaNote({
    id: record.id,
    noteColor: record.noteColor || undefined,
    sessionTitle: record.sessionTitle || undefined,
    teaName: record.teaName,
    teaType: record.teaType,
    region: record.region,
    originDetail: record.originDetail || undefined,
    cultivar: record.cultivar || undefined,
    source: record.source || undefined,
    processingStyle: record.processingStyle || undefined,
    harvestSeason: record.harvestSeason || undefined,
    harvestYear,
    skippedFields: record.skippedFields ?? [],
    brewingMode: record.brewingMode,
    brewingMethod: record.brewingMethod,
    waterSource: record.waterSource || undefined,
    setupId: record.setupId ?? undefined,
    setupSummary: record.setupSummary,
    leafGrams: record.leafGrams ?? undefined,
    waterTemp: record.waterTemp ?? undefined,
    waterVolumeMl: record.waterVolumeMl ?? undefined,
    rinseCount: record.rinseCount ?? undefined,
    infusionsCount: record.infusionsCount ?? undefined,
    timeValue: record.timeValue ?? undefined,
    timeUnit: record.timeUnit,
    descriptors: record.descriptors,
    liquorColor: record.liquorColor || undefined,
    mouthfeel: record.mouthfeel || undefined,
    energyEffect: record.energyEffect || undefined,
    freeText: record.freeText,
    ratings,
    updatedAt,
  });
}

export function teaNoteToRecord(note: TeaNote): NoteRecord {
  const r = note.ratings;
  return {
    id: note.id,
    noteColor: note.noteColor,
    sessionTitle: note.sessionTitle,
    teaName: note.teaName,
    teaType: note.teaType,
    region: note.region,
    originDetail: note.originDetail,
    cultivar: note.cultivar,
    source: note.source,
    processingStyle: note.processingStyle,
    harvestSeason: note.harvestSeason,
    harvestYear: note.harvestYear === undefined ? null : note.harvestYear,
    skippedFields: note.skippedFields?.length ? [...note.skippedFields] : undefined,
    brewingMode: note.brewingMode as NoteRecord['brewingMode'],
    brewingMethod: note.brewingMethod,
    waterSource: note.waterSource,
    setupId: note.setupId ?? null,
    setupSummary: note.setupSummary,
    leafGrams: note.leafGrams ?? null,
    waterTemp: note.waterTemp ?? null,
    waterVolumeMl: note.waterVolumeMl ?? null,
    rinseCount: note.rinseCount ?? null,
    infusionsCount: note.infusionsCount ?? null,
    timeValue: note.timeValue ?? null,
    timeUnit: note.timeUnit,
    descriptors: [...note.descriptors],
    liquorColor: note.liquorColor,
    mouthfeel: note.mouthfeel,
    energyEffect: note.energyEffect,
    freeText: note.freeText,
    ratings: {
      aroma: r?.aroma ?? 0,
      taste: r?.taste ?? 0,
      aftertaste: r?.aftertaste ?? 0,
      balance: r?.balance ?? 0,
    },
    updatedAt: note.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

export async function upsertTeaNoteRemote(record: NoteRecord): Promise<void> {
  const note = noteRecordToTeaNote(record);
  await client.upsertTeaNote(new UpsertTeaNoteRequest({ note }));
}

export async function listTeaNotesRemote(limit: number, offset: number): Promise<NoteRecord[]> {
  const res = await client.listTeaNotes(new ListTeaNotesRequest({ limit, offset }));
  return (res.notes ?? []).map(teaNoteToRecord);
}

export async function getTeaNoteRemote(noteId: string): Promise<NoteRecord | null> {
  const res = await client.getTeaNote(new GetTeaNoteRequest({ noteId }));
  return res.note ? teaNoteToRecord(res.note) : null;
}

export async function deleteTeaNoteRemote(noteId: string): Promise<void> {
  await client.deleteTeaNote(new DeleteTeaNoteRequest({ noteId }));
}
