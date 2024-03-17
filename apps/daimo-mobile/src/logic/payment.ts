import { DaimoPaymentLink } from "@daimo/common";
import { useQuery, useMutation } from "react-query";

export type OffBlocksPayment = {
  id: string;
  destinationName: string;
  gatewayWalletId: string;
  usdAmount: string;
};

export type OffBlocksSubmitPayment = {
  id: string;
  usdAmount: string;
  payerWalletId: string;
};

const usePayment = (link: DaimoPaymentLink) =>
  useQuery(["payment", link.id], () => fetchPayment(link));
export default usePayment;

const fetchPayment = async (link: DaimoPaymentLink) => {
  const res = await fetch(
    `https://9420-2a01-4b00-a408-8a00-607f-1362-e536-a455.ngrok-free.app/v1/payments/${link.id}`
  );
  return await res.json();
};

export const submitPayment = async (payment: OffBlocksSubmitPayment) => {
  const response = await fetch(
    `https://9420-2a01-4b00-a408-8a00-607f-1362-e536-a455.ngrok-free.app/v1/payments/${payment.id}/submit`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usdAmount: payment.usdAmount,
        payerWalletId: payment.payerWalletId,
      }),
    }
  );
  return await response.json();
};
