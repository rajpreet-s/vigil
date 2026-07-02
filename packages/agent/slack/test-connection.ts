import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { slack } from './client.js';

async function main() {
    console.log('Testing Slack configuration...');
    console.log('SLACK_BOT_TOKEN in env:', process.env.SLACK_BOT_TOKEN ? `${process.env.SLACK_BOT_TOKEN.slice(0, 15)}...` : 'undefined');
    console.log('slack.token on WebClient:', (slack as any).token ? `${(slack as any).token.slice(0, 15)}...` : 'undefined');
    console.log('SLACK_ONCALL_USER_ID:', process.env.SLACK_ONCALL_USER_ID);
    console.log('SLACK_INCIDENTS_CHANNEL:', process.env.SLACK_INCIDENTS_CHANNEL);
    console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? 'configured' : 'undefined');

    try {
        console.log('\nCalling slack.auth.test()...');
        const authTest = await slack.auth.test();
        console.log('✓ slack.auth.test() succeeded!');
        console.log('  Bot Name/User:', authTest.user);
        console.log('  Bot ID:', authTest.bot_id);
        console.log('  Team Name:', authTest.team);
        console.log('  Team ID:', authTest.team_id);
        console.log('  User ID (for bot):', authTest.user_id);
    } catch (error: any) {
        console.error('✗ slack.auth.test() failed!');
        console.error('  Error message:', error.message);
        console.error('  Error code:', error.code);
        if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_BOT_TOKEN.startsWith('xapp-')) {
            console.error('\n[Tip] It looks like you are using an App-Level Token (starting with \'xapp-\').');
            console.error('      For Slack WebClient API (sending messages), you must use a Bot User OAuth Token');
            console.error('      (typically starting with \'xoxb-\') under OAuth & Permissions in the Slack App settings.');
        }
        return;
    }

    // Try sending a test message if oncall user id or incidents channel is set
    const testChannel = process.env.SLACK_ONCALL_USER_ID || process.env.SLACK_INCIDENTS_CHANNEL;
    if (testChannel) {
        try {
            console.log(`\nAttempting to send test DM/message to channel/user: ${testChannel}...`);
            const postResponse = await slack.chat.postMessage({
                channel: testChannel,
                text: '⚡ Vigil Slack Configuration Test: Connection is successful and authenticated!',
            });
            console.log('✓ Test message sent successfully!');
            console.log('  TS:', postResponse.ts);
        } catch (error: any) {
            console.error('✗ Failed to send test message!');
            console.error('  Error message:', error.message);
            console.error('  Error code:', error.code);
        }
    } else {
        console.log('\nNo SLACK_ONCALL_USER_ID or SLACK_INCIDENTS_CHANNEL specified, skipping postMessage test.');
    }
}

main().catch(console.error);
