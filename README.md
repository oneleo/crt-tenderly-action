# crt-tenderly-action

Tenderly Web3 Action for Cross-Rollup Transfer (CRT) Relayer Monitoring

## Prerequisites

Before deploying this action, ensure you have the following setup:

1. **Tenderly Account & Project**

   - Create an account on [Tenderly](https://dashboard.tenderly.co/) and set up a new project.

2. **Slack WebHook for CRT Messages**

   - Obtain a WebHook URL from the [Slack API](https://api.slack.com/apps) or the [legacy version](https://my.slack.com/services/new/incoming-webhook).

3. **Configure Secrets in Tenderly**
   - In Tenderly’s Web3 Actions, add a secret named `SLACK_WEBHOOK` and set its value to the WebHook URL.
4. **Alchemy API Key**

   - Create an API key at [Alchemy Dashboard](https://dashboard.alchemy.com/apps).
   - Store the API key in Tenderly Web3 Secrets under the variable `ALCHEMY_API_KEY`.

5. **Define Token Threshold Storage**

   - Add a storage entry `TOKEN_THRESHOLD` as a JSON string, for example:

   ```json
   {
     "10": {
       "ETH": {
         "address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
         "decimals": 18,
         "threshold": 0.0025
       },
       "USDC": {
         "address": "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
         "decimals": 6,
         "threshold": 5.5
       }
     }
   }
   ```

6. **Install Tenderly CLI**

   - Install the Tenderly CLI on your local machine:

   ```shell
   brew tap tenderly/tenderly && brew install tenderly
   ```

## Deployment

### 1. Clone the Repository

```shell
# Clone the project
git clone https://github.com/oneleo/crt-tenderly-action.git
cd crt-tenderly-action/
```

### 2. Configure Tenderly Project

- Set your Tenderly account and project name in `tenderly.yaml` using the format: `[account_name]/[project_name]`.
- Example: If the account is `ntust` and the project name is `crt-tenderly-action`, modify `tenderly.yaml` as follows:

```yaml
actions:
  ntust/crt-tenderly-action:
```

### 3. Authenticate and Deploy

```shell
# Login to Tenderly (obtain a token from https://dashboard.tenderly.co/account/authorization)
tenderly login --force

# Build the Action project
tenderly actions build

# Deploy the Action to Tenderly Web3 Actions
tenderly actions deploy
```

## Monitoring

- The `actions/crtTenderlyAction.ts` script monitors the CRT relayer's token balances.
- If a token balance falls below the defined threshold, an alert is sent to the configured Slack channel.

---

This guide ensures a smooth setup and deployment process for monitoring cross-rollup transfers using Tenderly Web3 Actions.
