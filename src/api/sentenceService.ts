import api from "./axiosClient";
import { asRecord, collectionFrom } from "./dataContract";

export type RemissionRequest = {
  remissionPercentage: number;
  effectiveDate: string;
  reason: string;
};

export const sentenceService = {
  async listForInmate(inmateId: string): Promise<Record<string, unknown>[]> {
    const { data } = await api.get("/sentences", { params: { inmateId } });
    return collectionFrom(data).map(asRecord);
  },

  async listRemissions(sentenceId: string): Promise<Record<string, unknown>[]> {
    const { data } = await api.get(
      `/sentences/${encodeURIComponent(sentenceId)}/remissions`,
    );
    return collectionFrom(data).map(asRecord);
  },

  async addRemission(sentenceId: string, request: RemissionRequest): Promise<void> {
    await api.patch(`/sentences/${encodeURIComponent(sentenceId)}`, {
      remission: request,
    });
  },
};
