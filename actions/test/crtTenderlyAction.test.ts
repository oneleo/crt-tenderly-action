import { TestRuntime } from "@tenderly/actions-test";
import { expect } from "chai";
import { config } from "dotenv";

import { watchBalanceFn } from "../crtTenderlyAction";
import { transferUsdcPayload } from "./payload";
import type { TokenThreshold } from "../util";

const slackWebhookKey = `SLACK_WEBHOOK`;
const heartBeatCounterKey = `HEART_BEAT_COUNTER`;
const alchemyApiKeyKey = `ALCHEMY_API_KEY`;
const tokenThresholdKey = `TOKEN_THRESHOLD`;

describe("CRT Tenderly Web3 Actions", () => {
  let slackWebhook: string;
  let alchemyApiKey: string;
  let tokenThreshold: TokenThreshold;

  beforeEach(() => {
    config();
    slackWebhook = process.env.SLACK_WEBHOOK || ``;
    if (!slackWebhook) {
      console.warn("SLACK_WEBHOOK environment variable is missing");
    }

    alchemyApiKey = process.env.ALCHEMY_API_KEY || ``;
    if (!alchemyApiKey) {
      console.warn("ALCHEMY_API_KEY environment variable is missing");
    }

    tokenThreshold = {
      "10": {
        ETH: {
          address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          decimals: 18,
          threshold: 0.0025,
        },
        USDC: {
          address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
          decimals: 6,
          threshold: 5.5,
        },
      },
    };
  });

  it("Should initial heartbeat", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThreshold
    );

    await testRuntime.execute(watchBalanceFn, transferUsdcPayload);

    const heartBeatCounter = await testRuntime.context.storage.getNumber(
      heartBeatCounterKey
    );
    expect(heartBeatCounter).to.eq(1);
  });

  it("Should check heartbeat", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    await testRuntime.context.storage.putNumber(heartBeatCounterKey, 1);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThreshold
    );

    await testRuntime.execute(watchBalanceFn, transferUsdcPayload);

    const heartBeatCounter = await testRuntime.context.storage.getNumber(
      heartBeatCounterKey
    );
    expect(heartBeatCounter).to.eq(2);
  });

  it("Should notify Slack for heartbeat check", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    await testRuntime.context.storage.putNumber(heartBeatCounterKey, 199);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThreshold
    );

    await testRuntime.execute(watchBalanceFn, transferUsdcPayload);

    const heartBeatCounter = await testRuntime.context.storage.getNumber(
      heartBeatCounterKey
    );
    expect(heartBeatCounter).to.eq(200);
  });

  it("Should notify Slack for threshold alert", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    await testRuntime.context.storage.putNumber(heartBeatCounterKey, 1);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);

    tokenThreshold["10"].ETH.threshold = 100;
    tokenThreshold["10"].USDC.threshold = 100;
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThreshold
    );

    await testRuntime.execute(watchBalanceFn, transferUsdcPayload);
  });
});
