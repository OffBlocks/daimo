import { dollarsToAmount, DollarStr } from "@daimo/common";
import {
  DaimoOpSender,
  DaimoNonce,
  DaimoNonceMetadata,
  DaimoNonceType,
} from "@daimo/userop";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useMemo, ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useMutation } from "react-query";

import { useSendAsync } from "../../../action/useSendAsync";
import {
  ParamListHome,
  useExitBack,
  useExitToHome,
  useNav,
} from "../../../common/nav";
import usePayment, { submitPayment } from "../../../logic/payment";
import { Account } from "../../../model/account";
import { TitleAmount, getAmountText } from "../../shared/Amount";
import { LongPressBigButton } from "../../shared/Button";
import { ButtonWithStatus } from "../../shared/ButtonWithStatus";
import { InfoBox } from "../../shared/InfoBox";
import { ScreenHeader } from "../../shared/ScreenHeader";
import Spacer from "../../shared/Spacer";
import { ss } from "../../shared/style";
import { TextCenter, TextBold, TextError } from "../../shared/text";
import { useWithAccount } from "../../shared/withAccount";

type Props = NativeStackScreenProps<ParamListHome, "Payment">;

export function PaymentScreen(props: Props) {
  const Inner = useWithAccount(PaymentScreenInner);
  return <Inner {...props} />;
}

function PaymentScreenInner({ route, account }: Props & { account: Account }) {
  const { link } = route.params;
  console.log(`[NOTE] rendering PaymentScreen, link ${JSON.stringify(link)}`);

  const nav = useNav();
  const textInputRef = useRef<TextInput>(null);

  const [dollarsToSend, setDollarsToSend] = useState("0.0");

  const { data, isLoading } = usePayment(link);

  useEffect(() => {
    if (isLoading) return;
    setDollarsToSend(data.usdAmount);
  }, [isLoading]);

  // Generate nonce
  const nonce = useMemo(
    () => new DaimoNonce(new DaimoNonceMetadata(DaimoNonceType.Send)),
    []
  );

  // On exec, request signature from device enclave, send transfer.
  const { status, message, cost, exec } = useSendAsync({
    dollarsToSend: Number(dollarsToSend),
    sendFn: async (opSender: DaimoOpSender) => {
      console.log(
        `[ACTION] approving $${data.usdAmount} to ${data.gatewayWalletId}`
      );
      return opSender.erc20approve(
        data.gatewayWalletId as `0x${string}`,
        parseFloat(data.usdAmount).toFixed(2) as DollarStr,
        {
          nonce,
          chainGasConstants: account.chainGasConstants,
        }
      );
    },
  });

  const goBack = useExitBack();
  const goHome = useExitToHome();

  useEffect(() => {
    const unsubscribe = nav.addListener("transitionEnd", () => {
      // Set focus on transitionEnd to avoid stack navigator looking
      // glitchy on iOS.
      textInputRef.current?.focus();
    });

    return unsubscribe;
  }, []);

  const sendDisabledReason = (function () {
    if (account.lastBalance < dollarsToAmount(cost.totalDollars)) {
      return "Insufficient funds";
    } else {
      return undefined;
    }
  })();

  const disabled = sendDisabledReason != null;

  const button = (function () {
    switch (status) {
      case "idle":
      case "error":
        return (
          <LongPressBigButton
            title="HOLD TO AUTHORIZE"
            onPress={disabled ? undefined : exec}
            type="primary"
            disabled={disabled}
            duration={400}
            showBiometricIcon
          />
        );
      case "loading":
        return <ActivityIndicator size="large" />;
      case "success":
        return null;
    }
  })();

  const statusMessage = (function (): ReactNode {
    switch (status) {
      case "idle": {
        const totalStr = getAmountText({ dollars: cost.totalDollars });
        const hasFee = cost.feeDollars > 0;
        if (sendDisabledReason === "Insufficient funds" && hasFee) {
          return <TextError>You need at least {totalStr} to send</TextError>;
        } else if (sendDisabledReason === "Insufficient funds") {
          return <TextError>Insufficient funds</TextError>;
        } else if (sendDisabledReason != null) {
          return <TextError>{sendDisabledReason}</TextError>;
        } else if (hasFee) {
          return `Total with fees ${totalStr}`;
        } else {
          return null;
        }
      }
      case "loading": {
        return message;
      }
      case "error": {
        return <TextError>{message}</TextError>;
      }
      default: {
        return null;
      }
    }
  })();

  const { mutate } = useMutation(submitPayment);

  // On success, go home, show newly created transaction
  useEffect(() => {
    if (status !== "success") return;
    mutate({
      id: data.id,
      usdAmount: data.usdAmount,
      payerWalletId: account.address,
    });
    goHome();
  }, [status]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={ss.container.screen}>
        <ScreenHeader title="Payment" onBack={goBack || goHome} />
        <Spacer h={8} />
        <InfoBox
          title="Authorizing payment request"
          subtitle="Pay any merchant with your USDC"
        />
        <Spacer h={64} />
        <TextCenter>
          <TextBold>Paying to {data?.destinationName}</TextBold>
        </TextCenter>
        <Spacer h={8} />
        <TitleAmount amount={dollarsToAmount(dollarsToSend)} />
        <Spacer h={32} />
        <ButtonWithStatus button={button} status={statusMessage} />
      </View>
    </TouchableWithoutFeedback>
  );
}
