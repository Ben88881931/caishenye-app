window.APP_SNAPSHOTS = {
  "generatedAt": "2026-09-22T14:47:35.666Z",
  "settledCount": 4,
  "grades": {
    "S": {
      "single": {
        "n": 0,
        "hits": 0,
        "miss": 0
      }
    },
    "A": {
      "single": {
        "n": 3,
        "hits": 0,
        "miss": 3
      }
    },
    "B": {
      "single": {
        "n": 0,
        "hits": 0,
        "miss": 0
      }
    },
    "C": {
      "single": {
        "n": 4,
        "hits": 3,
        "miss": 1
      }
    },
    "D": {
      "single": {
        "n": 1,
        "hits": 1,
        "miss": 0
      }
    }
  },
  "overallAtLeastOne": {
    "n": 4,
    "hits": 3,
    "miss": 1
  },
  "combos": {
    "C+D": {
      "n": 1,
      "hits": 1,
      "miss": 0
    },
    "C+C": {
      "n": 1,
      "hits": 1,
      "miss": 0
    },
    "A+C": {
      "n": 1,
      "hits": 1,
      "miss": 0
    },
    "A+A": {
      "n": 1,
      "hits": 0,
      "miss": 1
    }
  },
  "scoreBuckets": {
    "95.x": {
      "n": 0,
      "hits": 0,
      "miss": 0,
      "rolls": []
    },
    "94.x": {
      "n": 0,
      "hits": 0,
      "miss": 0,
      "rolls": []
    },
    "93.x": {
      "n": 3,
      "hits": 0,
      "miss": 3,
      "rolls": [
        {
          "target": 264,
          "tail": 3,
          "score": 93.9,
          "tag": "连出3",
          "hit": false
        },
        {
          "target": 265,
          "tail": 2,
          "score": 93.9,
          "tag": "连出3",
          "hit": false
        },
        {
          "target": 265,
          "tail": 8,
          "score": 93.9,
          "tag": "连出3",
          "hit": false
        }
      ]
    },
    "92.x": {
      "n": 5,
      "hits": 4,
      "miss": 1,
      "rolls": [
        {
          "target": 262,
          "tail": 3,
          "score": 92.5,
          "tag": "5期3次",
          "hit": true
        },
        {
          "target": 262,
          "tail": 7,
          "score": 92.1,
          "tag": "7期4次",
          "hit": true
        },
        {
          "target": 263,
          "tail": 2,
          "score": 92.5,
          "tag": "5期3次",
          "hit": true
        },
        {
          "target": 263,
          "tail": 5,
          "score": 92.5,
          "tag": "5期3次",
          "hit": false
        },
        {
          "target": 264,
          "tail": 4,
          "score": 92.5,
          "tag": "5期3次",
          "hit": true
        }
      ]
    },
    "91.x": {
      "n": 0,
      "hits": 0,
      "miss": 0,
      "rolls": []
    },
    "其他": {
      "n": 0,
      "hits": 0,
      "miss": 0,
      "rolls": []
    }
  },
  "tags": {
    "5期3次": {
      "n": 4,
      "hits": 3,
      "miss": 1,
      "rolls": [
        {
          "target": 262,
          "tail": 3,
          "score": 92.5,
          "bucket": "92.x",
          "hit": true
        },
        {
          "target": 263,
          "tail": 2,
          "score": 92.5,
          "bucket": "92.x",
          "hit": true
        },
        {
          "target": 263,
          "tail": 5,
          "score": 92.5,
          "bucket": "92.x",
          "hit": false
        },
        {
          "target": 264,
          "tail": 4,
          "score": 92.5,
          "bucket": "92.x",
          "hit": true
        }
      ]
    },
    "7期4次": {
      "n": 1,
      "hits": 1,
      "miss": 0,
      "rolls": [
        {
          "target": 262,
          "tail": 7,
          "score": 92.1,
          "bucket": "92.x",
          "hit": true
        }
      ]
    },
    "连出3": {
      "n": 3,
      "hits": 0,
      "miss": 3,
      "rolls": [
        {
          "target": 264,
          "tail": 3,
          "score": 93.9,
          "bucket": "93.x",
          "hit": false
        },
        {
          "target": 265,
          "tail": 2,
          "score": 93.9,
          "bucket": "93.x",
          "hit": false
        },
        {
          "target": 265,
          "tail": 8,
          "score": 93.9,
          "bucket": "93.x",
          "hit": false
        }
      ]
    }
  },
  "detail": [
    {
      "target": 262,
      "picks": [
        {
          "tail": 3,
          "score": 92.5,
          "tag": "5期3次",
          "bucket": "92.x",
          "grade": "C",
          "hit": true
        },
        {
          "tail": 7,
          "score": 92.1,
          "tag": "7期4次",
          "bucket": "92.x",
          "grade": "D",
          "hit": true
        }
      ],
      "actualTails": [
        0,
        2,
        3,
        6,
        7,
        8
      ],
      "atLeastOne": true,
      "settledAt": "2026-09-19T13:45:40.822Z"
    },
    {
      "target": 263,
      "picks": [
        {
          "tail": 2,
          "score": 92.5,
          "tag": "5期3次",
          "bucket": "92.x",
          "grade": "C",
          "hit": true
        },
        {
          "tail": 5,
          "score": 92.5,
          "tag": "5期3次",
          "bucket": "92.x",
          "grade": "C",
          "hit": false
        }
      ],
      "actualTails": [
        2,
        3,
        4,
        8,
        9
      ],
      "atLeastOne": true,
      "settledAt": "2026-09-20T14:27:28.378Z"
    },
    {
      "target": 264,
      "picks": [
        {
          "tail": 3,
          "score": 93.9,
          "tag": "连出3",
          "bucket": "93.x",
          "grade": "A",
          "hit": false
        },
        {
          "tail": 4,
          "score": 92.5,
          "tag": "5期3次",
          "bucket": "92.x",
          "grade": "C",
          "hit": true
        }
      ],
      "actualTails": [
        0,
        1,
        2,
        4,
        6,
        8
      ],
      "atLeastOne": true,
      "settledAt": "2026-09-21T15:05:32.139Z"
    },
    {
      "target": 265,
      "picks": [
        {
          "tail": 2,
          "score": 93.9,
          "tag": "连出3",
          "bucket": "93.x",
          "grade": "A",
          "hit": false
        },
        {
          "tail": 8,
          "score": 93.9,
          "tag": "连出3",
          "bucket": "93.x",
          "grade": "A",
          "hit": false
        }
      ],
      "actualTails": [
        0,
        3,
        4,
        5,
        6,
        9
      ],
      "atLeastOne": false,
      "settledAt": "2026-09-22T14:12:26.982Z"
    }
  ]
};
