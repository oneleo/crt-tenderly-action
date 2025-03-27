import { ActionFn, Context, Event, TransactionEvent } from "@tenderly/actions";
import { getAddress, JsonRpcProvider } from "ethers";

import {
  ChainId,
  getTransactionUrl,
  getRpcUrl,
  ERC20,
  getNetworkName,
  getAddressUrl,
  sendSlackNotification,
  getTokenUrl,
} from "./util";
import type { TokenThreshold } from "./util";

const nativeTokenAddress = getAddress(
  `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`
);

export const watchBalanceFn: ActionFn = async (
  context: Context,
  event: Event
) => {
  const transactionEvent = event as TransactionEvent;
  const chainId = parseInt(transactionEvent.network);
  if (!Object.values(ChainId).includes(chainId)) {
    console.error(`Unsupported chain id: ${chainId}`);
    return;
  }

  const transactionHash = transactionEvent.hash;
  console.log(`Transaction: ${getTransactionUrl(chainId, transactionHash)}`);

  const transactionFrom = transactionEvent.from;
  console.log(`Transaction from address: ${transactionFrom}`);

  // Refer:
  // https://docs.tenderly.co/web3-actions/references/context-storage-and-secrets
  // Example:
  // SLACK_WEBHOOK=https://hooks.slack.com/services/xxx/xxx/xxx
  const slackWebhook: string = await context.secrets.get(`SLACK_WEBHOOK`);
  const alchemyApiKey: string = await context.secrets.get(`ALCHEMY_API_KEY`);
  if (!alchemyApiKey) {
    console.error(`Alchemy api key not found`);
    return;
  }
  // Example:
  // TOKEN_THRESHOLD={"10":{"ETH":{"address":"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE","decimals":18,"threshold":0.0025},"USDC":{"address":"0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85","decimals":6,"threshold":5.5}}}
  const tokenThreshold: TokenThreshold = await context.storage.getJson(
    `TOKEN_THRESHOLD`
  );
  console.log(`Token threshold: ${JSON.stringify(tokenThreshold)}`);

  const rpcUrl = getRpcUrl(chainId, alchemyApiKey);
  if (!rpcUrl) {
    console.error(`Unsupported chainId: ${chainId}`);
    return;
  }

  const provider = new JsonRpcProvider(rpcUrl);

  for (const [chain, tokens] of Object.entries(tokenThreshold)) {
    if (parseInt(chain) !== chainId) {
      continue;
    }

    for (const [tokenSymbol, tokenInfo] of Object.entries(tokens)) {
      const tAddress = getAddress(tokenInfo.address);

      if (tAddress === nativeTokenAddress) {
        const nativeTokenBalance = await provider.getBalance(transactionFrom);
        const formatedNativeTokenBalance = ERC20.formatAmount(
          nativeTokenBalance,
          18
        );
        const tSymbol = tokenSymbol.toUpperCase();

        await alertEthBalanceBelowThreshold(
          chainId,
          transactionHash,
          transactionFrom,
          tSymbol,
          formatedNativeTokenBalance,
          tokenInfo.threshold,
          slackWebhook
        );
      }

      if (tAddress !== nativeTokenAddress) {
        const erc20 = ERC20.init(tAddress, provider);
        const erc20TokenBalance = await erc20.balanceOf(transactionFrom);
        const formatedErc20TokenBalance = await erc20.formatAmount(
          erc20TokenBalance
        );
        const tSymbol = await erc20.symbol();

        await alertTokenBalanceBelowThreshold(
          chainId,
          transactionHash,
          transactionFrom,
          tSymbol,
          tAddress,
          formatedErc20TokenBalance,
          tokenInfo.threshold,
          slackWebhook
        );
      }

      console.log(
        `${tokenSymbol} - Address: ${tokenInfo.address}, Decimals: ${tokenInfo.decimals}, Threshold: ${tokenInfo.threshold}`
      );
    }
  }
};

const alertEthBalanceBelowThreshold = async (
  chainId: number,
  transactionHash: string,
  accountAddress: string,
  tokenSymbol: string,
  balance: number,
  threshold: number,
  webhookUrl: string
) => {
  if (balance > threshold) {
    return;
  }
  const networkName = getNetworkName(chainId);
  const accountUrl = getAddressUrl(chainId, accountAddress);
  const transactionUrl = getTransactionUrl(chainId, transactionHash);
  const title = `*_(CRT) ${tokenSymbol} Balance Below Threshold Alert ⚠️_*`;

  const message = `*[Description]*\n\tThe ${tokenSymbol} balance for CRT on ${networkName} is <${accountUrl}|${balance}> (below threshold of ${threshold}).\n*[Impact]*\n\tLow balance may lead to transaction failures or delays in cross-rollup transfers.\n*[Action Needed]*\n\t1. Check CRT relayer's ${tokenSymbol} balance.\n\t2. Investigate recent withdrawals.\n\t3. Replenish ${tokenSymbol} if necessary.\n*[Details]*\n\t1. CRT relayer: <${accountUrl}|${accountAddress}>.\n\t2. CRT guide: <https://imtoken.atlassian.net/wiki/spaces/IL/pages/1783398435|CRT confluence>.\n*[Contact]*\n\t1. Jiahui: <@U03TKT79H7V>\n\t2. Alfred: <@U040T88AV62>\n\t3. Cyan: <@U021R1Q76U9>\n*[Triggered by]*\n\tTransaction: <${transactionUrl}|${transactionHash}>.`;

  console.error(`title & text: ${title}\n${message}`);
  await sendSlackNotification(title, message, webhookUrl);
};

const alertTokenBalanceBelowThreshold = async (
  chainId: number,
  transactionHash: string,
  accountAddress: string,
  tokenSymbol: string,
  tokenAddress: string,
  balance: number,
  threshold: number,
  webhookUrl: string
) => {
  if (balance > threshold) {
    return;
  }
  const networkName = getNetworkName(chainId);
  const accountUrl = getAddressUrl(chainId, accountAddress);
  const transactionUrl = getTransactionUrl(chainId, transactionHash);
  const balanceUrl = getTokenUrl(chainId, accountAddress, tokenAddress);
  const title = `*_(CRT) ${tokenSymbol} Balance Below Threshold Alert ⚠️_*`;

  const message = `*[Description]*\n\tThe ${tokenSymbol} balance for CRT on ${networkName} is <${balanceUrl}|${balance}> (below threshold of ${threshold}).\n*[Impact]*\n\tLow balance may lead to transaction failures or delays in cross-rollup transfers.\n*[Action Needed]*\n\t1. Check CRT relayer's ${tokenSymbol} balance.\n\t2. Investigate recent withdrawals.\n\t3. Replenish ${tokenSymbol} if necessary.\n*[Details]*\n\t1. CRT relayer: <${accountUrl}|${accountAddress}>.\n\t2. CRT guide: <https://imtoken.atlassian.net/wiki/spaces/IL/pages/1783398435|CRT confluence>.\n*[Contact]*\n\t1. Jiahui: <@U03TKT79H7V>\n\t2. Alfred: <@U040T88AV62>\n\t3. Cyan: <@U021R1Q76U9>\n*[Triggered by]*\n\tTransaction: <${transactionUrl}|${transactionHash}>.`;

  console.error(`title & text: ${title}\n${message}`);
  await sendSlackNotification(title, message, webhookUrl);
};
