import express from 'express';

const app = express();
const port = process.env.PORT || 3333;

async function getAccountPUUID(username, tagline) {
    const url = 'https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/' + `${encodeURIComponent(username)}/${encodeURIComponent(tagline)}`;

    const response = await fetch(url, {
        headers: {
            'X-Riot-Token': 'RGAPI-20515f5a-fe4d-41c9-8617-7f10d0a9116b'
        }
    });

    return response.json();
}

async function getMatchData(puuid, userChampion, enemyChampion) {
    const url = 'https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/' + `${puuid}` + '/ids?start=0&count=20';

    const response = await fetch(url, {
        headers: {
            'X-Riot-Token': 'RGAPI-20515f5a-fe4d-41c9-8617-7f10d0a9116b'
        }
    });

    const matchIds = await response.json();

    const results = [];

    for (const matchId of matchIds) {
        const url = 'https://asia.api.riotgames.com/lol/match/v5/matches/' + `${matchId}`;

        const response = await fetch(url, {
            headers: {
                'X-Riot-Token': 'RGAPI-20515f5a-fe4d-41c9-8617-7f10d0a9116b'
            }
        });
        
        const matchInfo = await response.json();

        for (const participant of matchInfo.info.participants) {
            if (participant.championName == userChampion && matchInfo.info.participants.some(x => x.championName == enemyChampion)) {
                results.push({
                    won: participant.win,
                    items: [
                        participant.item0,
                        participant.item1,
                        participant.item2,
                        participant.item3,
                        participant.item4,
                        participant.item5
                    ]
                });
            }
        }
    }

    return results;
}

function calculateBestBuild(matchData) {
    const itemWinRate = {};

    let wins = 0;

    for (const match of matchData) {
        if (match.won) {
            wins++;
        }

        for (const item of match.items) {
            if (!item) {
                continue;
            }

            if (!itemWinRate[item]) {
                itemWinRate[item] = { wins: 0, total: 0 };
            }

            itemWinRate[item].total++;

            if (match.won) {
                itemWinRate[item].wins++;
            }
        }
    }

    const sorted = Object.entries(itemWinRate).map(([item, data]) => ({
        item,
        winRate: data.wins / data.total
    })).sort((a, b) => b.winRate - a.winRate);

    return {
        matchCount: matchData.length,
        winRate: wins / matchData.length,
        bestItems: sorted.slice(0, 5)
    };
}

app.get('/', async (req, res) => {
    const account = await getAccountPUUID('Hide on bush', 'KR1');

    const matchData = await getMatchData(account.puuid, "Yone", "Galio");

    console.log(matchData);

    const bestBuild = calculateBestBuild(matchData);

    res.json(bestBuild);
});

app.listen(port, () => {
    console.log(`Test app runt op port ${port}`);
})