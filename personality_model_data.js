window.APP_PERSONALITY_MODEL = {
  "version": "next-window-v7-20261026",
  "method": "per-line-dual-direction-risk-cascade-v6",
  "generatedAt": "2026-10-29T13:38:22.696Z",
  "asOfPeriod": 1467,
  "target": 1468,
  "trainingYears": [
    2021,
    2022,
    2023,
    2024
  ],
  "validationYears": [
    2025,
    2026
  ],
  "linePrior": 30,
  "statePrior": 20,
  "uniformWeightsUsed": false,
  "oneTwoThreeWeightMix": false,
  "riskCascade": true,
  "bidirectionalRiskCascade": true,
  "lookAheadUsed": false,
  "overlappingWindows": true,
  "lines": [
    {
      "id": "tail0",
      "label": "尾0",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1219,
        "misses": 236,
        "rate": 0.8378006872852234,
        "baseline": 0.8209663575536037,
        "edge": 0.01683432973161969,
        "stageShare": {
          "first": 0.5660377358490566,
          "second": 0.29286300246103364,
          "third": 0.14109926168990977
        },
        "stageCounts": {
          "first": 690,
          "second": 357,
          "third": 172
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 359,
            "hits": 307
          },
          "after_two_misses": {
            "n": 172,
            "hits": 142
          },
          "after_hit": {
            "n": 689,
            "hits": 596
          },
          "after_three_plus_misses": {
            "n": 229,
            "hits": 168
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 176,
          "rate": 0.7619047619047619
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 179,
          "rate": 0.7748917748917749
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 188,
          "rate": 0.8138528138528138
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 195,
          "rate": 0.8441558441558441
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 268,
          "rate": 0.8933333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.8419641649355917,
          "brier": 0.1101646713851338,
          "baselineBrier": 0.07883755317389056,
          "brierSkill": -0.3973628930637356
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 268,
          "rate": 0.8933333333333333,
          "baseline": 0.8516367039601678,
          "brier": 0.11098674822045676,
          "baselineBrier": 0.09736475967495738,
          "brierSkill": -0.13990676494221366
        }
      ],
      "current": {
        "target": 1468,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 689,
        "hits": 596,
        "lineRate": 0.8381447413846264,
        "predictedRate": 0.8548313652056725,
        "baseline": 0.8548313652056725,
        "edge": 0,
        "lower": 0.8474903800519726,
        "upper": 0.880821280579698,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.48455645519808865,
            "baseline": 0.47443762781186094,
            "edge": 0.010118827386227713,
            "samples": 693,
            "hits": 336,
            "lineRate": 0.47443762781186094
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7526797125624771,
            "baseline": 0.723784192939976,
            "edge": 0.028895519622501142,
            "samples": 690,
            "hits": 520,
            "lineRate": 0.7201297959679406
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.864263603424108,
            "baseline": 0.8548313652056725,
            "edge": 0.009432238218435529,
            "samples": 689,
            "hits": 596,
            "lineRate": 0.8381447413846264
          }
        },
        "riskLevels": [
          "safe",
          "safe",
          "safe"
        ],
        "riskPattern": "safe-safe-safe|safe-safe-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 543,
            "patternHits": 463,
            "predictedRate": 0.852154342500342
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 543,
            "patternHits": 463,
            "predictedRate": 0.852154342500342
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 83.8%（1219/1455），第1/2/3期结束 57/29/14%，当前上一期开出状态。综合：一期48.5% / 两期75.3% / 三期86.4%，正向 1→2→3 安全→安全→安全（463/543）；反向 3→2→1 安全→安全→安全（463/543），最终判定：双向全安全·高分。"
      }
    },
    {
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1326,
        "misses": 129,
        "rate": 0.911340206185567,
        "baseline": 0.9096233751397476,
        "edge": 0.0017168310458194336,
        "stageShare": {
          "first": 0.6040723981900452,
          "second": 0.27526395173454,
          "third": 0.12066365007541478
        },
        "stageCounts": {
          "first": 801,
          "second": 365,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 365,
            "hits": 331
          },
          "after_hit": {
            "n": 797,
            "hits": 734
          },
          "after_two_misses": {
            "n": 160,
            "hits": 141
          },
          "after_three_plus_misses": {
            "n": 127,
            "hits": 114
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 205,
          "rate": 0.8874458874458875
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 280,
          "rate": 0.9333333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 209,
          "rate": 0.9047619047619048,
          "baseline": 0.9089090356805571,
          "brier": 0.08661951496485117,
          "baselineBrier": 0.08637437409156325,
          "brierSkill": -0.002838120401637223
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 280,
          "rate": 0.9333333333333333,
          "baseline": 0.910062194226245,
          "brier": 0.07081522956800419,
          "baselineBrier": 0.0627876249790443,
          "brierSkill": -0.12785329261361844
        }
      ],
      "current": {
        "target": 1468,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 797,
        "hits": 734,
        "lineRate": 0.9113083321391647,
        "predictedRate": 0.8424689916926348,
        "baseline": 0.9097624408886552,
        "edge": -0.06729344919602043,
        "lower": 0.9078388527396606,
        "upper": 0.9323411335970844,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5473656693205207,
            "baseline": 0.5514655760054533,
            "edge": -0.004099906684932653,
            "samples": 804,
            "hits": 440,
            "lineRate": 0.5514655760054533
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8002789698992127,
            "baseline": 0.7988168704918802,
            "edge": 0.00146209940733244,
            "samples": 801,
            "hits": 641,
            "lineRate": 0.8014517143626804
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9207174622310689,
            "baseline": 0.9097624408886552,
            "edge": 0.010955021342413662,
            "samples": 797,
            "hits": 734,
            "lineRate": 0.9113083321391647
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "safe"
        ],
        "riskPattern": "risk-risk-safe|safe-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "safe"
            ],
            "riskPattern": "risk-risk-safe",
            "patternSamples": 23,
            "patternHits": 18,
            "predictedRate": 0.8424689916926348
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 23,
            "patternHits": 18,
            "predictedRate": 0.8424689916926348
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1326/1455），第1/2/3期结束 60/28/12%，当前上一期开出状态。综合：一期54.7% / 两期80.0% / 三期92.1%，正向 1→2→3 风险→风险→安全（18/23）；反向 3→2→1 安全→风险→风险（18/23），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1333,
        "misses": 122,
        "rate": 0.9161512027491409,
        "baseline": 0.9383349028082042,
        "edge": -0.022183700059063338,
        "stageShare": {
          "first": 0.6316579144786196,
          "second": 0.25431357839459867,
          "third": 0.1140285071267817
        },
        "stageCounts": {
          "first": 842,
          "second": 339,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 838,
            "hits": 768
          },
          "after_one_miss": {
            "n": 338,
            "hits": 306
          },
          "after_two_misses": {
            "n": 151,
            "hits": 140
          },
          "after_three_plus_misses": {
            "n": 122,
            "hits": 113
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 215,
          "rate": 0.9307359307359307
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 222,
          "rate": 0.961038961038961
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 261,
          "rate": 0.87
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.9341438982351735,
          "brier": 0.10261221730845332,
          "baselineBrier": 0.07210203565371867,
          "brierSkill": -0.4231528469080206
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 261,
          "rate": 0.87,
          "baseline": 0.9285212843075097,
          "brier": 0.1316885087300816,
          "baselineBrier": 0.11664544148319526,
          "brierSkill": -0.12896403884804641
        }
      ],
      "current": {
        "target": 1468,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 838,
        "hits": 768,
        "lineRate": 0.9163494106045723,
        "predictedRate": 0.9173392209973998,
        "baseline": 0.9259624915929919,
        "edge": -0.008623270595592092,
        "lower": 0.9034059314344657,
        "upper": 0.927904308783228,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5970033548525069,
            "baseline": 0.580095432856169,
            "edge": 0.016907921996337838,
            "samples": 847,
            "hits": 506,
            "lineRate": 0.580095432856169
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.819319791986797,
            "baseline": 0.823680154491752,
            "edge": -0.004360362504954973,
            "samples": 842,
            "hits": 690,
            "lineRate": 0.8126830346309541
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9164650212262139,
            "baseline": 0.9259624915929919,
            "edge": -0.00949747036677806,
            "samples": 838,
            "hits": 768,
            "lineRate": 0.9163494106045723
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "risk"
        ],
        "riskPattern": "safe-risk-risk|risk-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 714,
            "patternHits": 655,
            "predictedRate": 0.9173392209973998
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "safe"
            ],
            "riskPattern": "risk-risk-safe",
            "patternSamples": 714,
            "patternHits": 655,
            "predictedRate": 0.9173392209973998
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1333/1455），第1/2/3期结束 63/25/11%，当前上一期开出状态。综合：一期59.7% / 两期81.9% / 三期91.6%，正向 1→2→3 安全→风险→风险（655/714）；反向 3→2→1 风险→风险→安全（655/714），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1320,
        "misses": 135,
        "rate": 0.9072164948453608,
        "baseline": 0.9146298971692742,
        "edge": -0.0074134023239134095,
        "stageShare": {
          "first": 0.6113636363636363,
          "second": 0.2689393939393939,
          "third": 0.11969696969696969
        },
        "stageCounts": {
          "first": 807,
          "second": 355,
          "third": 158
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 354,
            "hits": 321
          },
          "after_hit": {
            "n": 804,
            "hits": 739
          },
          "after_two_misses": {
            "n": 156,
            "hits": 138
          },
          "after_three_plus_misses": {
            "n": 135,
            "hits": 116
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 211,
          "rate": 0.9134199134199135
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 218,
          "rate": 0.9437229437229437
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 256,
          "rate": 0.8533333333333334
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 219,
          "rate": 0.948051948051948,
          "baseline": 0.9191288645846455,
          "brier": 0.05656934295699548,
          "baselineBrier": 0.05014791876744616,
          "brierSkill": -0.12804966481914737
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 256,
          "rate": 0.8533333333333334,
          "baseline": 0.9157382402636237,
          "brier": 0.13210159204236205,
          "baselineBrier": 0.12904806738289987,
          "brierSkill": -0.02366191700029141
        }
      ],
      "current": {
        "target": 1468,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 804,
        "hits": 739,
        "lineRate": 0.9073254915992387,
        "predictedRate": 0.8977194182708694,
        "baseline": 0.9126118341623196,
        "edge": -0.014892415891450184,
        "lower": 0.905979152909441,
        "upper": 0.9306244647929922,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5638518562214881,
            "baseline": 0.556237218813906,
            "edge": 0.00761463740758217,
            "samples": 812,
            "hits": 458,
            "lineRate": 0.556237218813906
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8028743559757743,
            "baseline": 0.8030745940339828,
            "edge": -0.00020023805820856833,
            "samples": 807,
            "hits": 648,
            "lineRate": 0.7988546195982693
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9188671235825058,
            "baseline": 0.9126118341623196,
            "edge": 0.006255289420186161,
            "samples": 804,
            "hits": 739,
            "lineRate": 0.9073254915992387
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "safe"
        ],
        "riskPattern": "safe-risk-safe|safe-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 135,
            "patternHits": 121,
            "predictedRate": 0.8977194182708694
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 135,
            "patternHits": 121,
            "predictedRate": 0.8977194182708694
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.7%（1320/1455），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.4% / 两期80.3% / 三期91.9%，正向 1→2→3 安全→风险→安全（121/135）；反向 3→2→1 安全→风险→安全（121/135），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1312,
        "misses": 143,
        "rate": 0.9017182130584193,
        "baseline": 0.9051885251973293,
        "edge": -0.0034703121389100255,
        "stageShare": {
          "first": 0.5884146341463414,
          "second": 0.27515243902439024,
          "third": 0.1364329268292683
        },
        "stageCounts": {
          "first": 772,
          "second": 361,
          "third": 179
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 770,
            "hits": 697
          },
          "after_one_miss": {
            "n": 362,
            "hits": 323
          },
          "after_two_misses": {
            "n": 176,
            "hits": 160
          },
          "after_three_plus_misses": {
            "n": 141,
            "hits": 126
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 220,
          "rate": 0.9523809523809523
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 203,
          "rate": 0.8787878787878788
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 200,
          "rate": 0.8658008658008658
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 204,
          "rate": 0.8831168831168831
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 277,
          "rate": 0.9233333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 204,
          "rate": 0.8831168831168831,
          "baseline": 0.9002478996307975,
          "brier": 0.113625602845391,
          "baselineBrier": 0.10359967091892772,
          "brierSkill": -0.09677571209959845
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 277,
          "rate": 0.9233333333333333,
          "baseline": 0.8966125865323862,
          "brier": 0.07909829455706313,
          "baselineBrier": 0.07158415433711646,
          "brierSkill": -0.10496932302307838
        }
      ],
      "current": {
        "target": 1468,
        "tail": 4,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 770,
        "hits": 697,
        "lineRate": 0.9016289111975555,
        "predictedRate": 0.8939120556771786,
        "baseline": 0.8972977709456659,
        "edge": -0.0033857152684872993,
        "lower": 0.8908084321454841,
        "upper": 0.9178604987941892,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5322034507917913,
            "baseline": 0.5316973415132924,
            "edge": 0.000506109278498923,
            "samples": 776,
            "hits": 413,
            "lineRate": 0.5316973415132924
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7684248721047096,
            "baseline": 0.7806926200542821,
            "edge": -0.012267747949572527,
            "samples": 772,
            "hits": 593,
            "lineRate": 0.7796249353464979
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9051045293974064,
            "baseline": 0.8972977709456659,
            "edge": 0.007806758451740503,
            "samples": 770,
            "hits": 697,
            "lineRate": 0.9016289111975555
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "safe"
        ],
        "riskPattern": "safe-risk-safe|safe-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 451,
            "patternHits": 403,
            "predictedRate": 0.8939120556771786
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 451,
            "patternHits": 403,
            "predictedRate": 0.8939120556771786
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.2%（1312/1455），第1/2/3期结束 59/28/14%，当前上一期开出状态。综合：一期53.2% / 两期76.8% / 三期90.5%，正向 1→2→3 安全→风险→安全（403/451）；反向 3→2→1 安全→风险→安全（403/451），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1326,
        "misses": 129,
        "rate": 0.911340206185567,
        "baseline": 0.9115517189720117,
        "edge": -0.00021151278644471194,
        "stageShare": {
          "first": 0.6055806938159879,
          "second": 0.26772247360482654,
          "third": 0.12669683257918551
        },
        "stageCounts": {
          "first": 803,
          "second": 355,
          "third": 168
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 799,
            "hits": 729
          },
          "after_one_miss": {
            "n": 354,
            "hits": 325
          },
          "after_two_misses": {
            "n": 167,
            "hits": 151
          },
          "after_three_plus_misses": {
            "n": 129,
            "hits": 115
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 217,
          "rate": 0.9393939393939394
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 266,
          "rate": 0.8866666666666667
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9160271011339205,
          "brier": 0.10447428182733717,
          "baselineBrier": 0.08990699581094128,
          "brierSkill": -0.1620261680974009
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 266,
          "rate": 0.8866666666666667,
          "baseline": 0.9132781171162795,
          "brier": 0.11003753559632724,
          "baselineBrier": 0.10117576483122759,
          "brierSkill": -0.08758788015966146
        }
      ],
      "current": {
        "target": 1468,
        "tail": 5,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 799,
        "hits": 729,
        "lineRate": 0.911324904591722,
        "predictedRate": 0.8956552885745034,
        "baseline": 0.9105827772902393,
        "edge": -0.014927488715735904,
        "lower": 0.8987291506144186,
        "upper": 0.9243640210346054,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5569692228213596,
            "baseline": 0.5528289025221541,
            "edge": 0.004140320299205524,
            "samples": 806,
            "hits": 449,
            "lineRate": 0.5528289025221541
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7921453572025496,
            "baseline": 0.8000380095804589,
            "edge": -0.00789265237790926,
            "samples": 803,
            "hits": 636,
            "lineRate": 0.7967814488849188
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9123644665345964,
            "baseline": 0.9105827772902393,
            "edge": 0.0017816892443570653,
            "samples": 799,
            "hits": 729,
            "lineRate": 0.911324904591722
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "safe"
        ],
        "riskPattern": "safe-risk-safe|safe-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 112,
            "patternHits": 100,
            "predictedRate": 0.8956552885745034
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 112,
            "patternHits": 100,
            "predictedRate": 0.8956552885745034
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1326/1455），第1/2/3期结束 61/27/13%，当前上一期开出状态。综合：一期55.7% / 两期79.2% / 三期91.2%，正向 1→2→3 安全→风险→安全（100/112）；反向 3→2→1 安全→风险→安全（100/112），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail6",
      "label": "尾6",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1348,
        "misses": 107,
        "rate": 0.9264604810996564,
        "baseline": 0.9169226439043533,
        "edge": 0.0095378371953031,
        "stageShare": {
          "first": 0.6097922848664689,
          "second": 0.2655786350148368,
          "third": 0.12462908011869436
        },
        "stageCounts": {
          "first": 822,
          "second": 358,
          "third": 168
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 818,
            "hits": 755
          },
          "after_one_miss": {
            "n": 360,
            "hits": 336
          },
          "after_two_misses": {
            "n": 168,
            "hits": 158
          },
          "after_three_plus_misses": {
            "n": 103,
            "hits": 94
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 211,
          "rate": 0.9134199134199135
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 282,
          "rate": 0.94
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.914101679464,
          "brier": 0.12076778505940321,
          "baselineBrier": 0.0898989285526357,
          "brierSkill": -0.3433729078171808
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 282,
          "rate": 0.94,
          "baseline": 0.9137388918144929,
          "brier": 0.10196848768640407,
          "baselineBrier": 0.05723353417270363,
          "brierSkill": -0.7816213721611458
        }
      ],
      "current": {
        "target": 1468,
        "tail": 6,
        "state": "after_three_plus_misses",
        "stateLabel": "连续遗漏3期以上",
        "samples": 103,
        "hits": 94,
        "lineRate": 0.9262529229403715,
        "predictedRate": 0.9436961605113688,
        "baseline": 0.9161863522150558,
        "edge": 0.027509808296313,
        "lower": 0.8702392728904409,
        "upper": 0.9420820164259096,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5859795501022496,
            "baseline": 0.5623721881390593,
            "edge": 0.023607361963190243,
            "samples": 105,
            "hits": 62,
            "lineRate": 0.5623721881390593
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.814584466904252,
            "baseline": 0.8084818982858051,
            "edge": 0.006102568618446935,
            "samples": 103,
            "hits": 84,
            "lineRate": 0.8096944714611497
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9148378736488408,
            "baseline": 0.9161863522150558,
            "edge": -0.0013484785662150056,
            "samples": 103,
            "hits": 94,
            "lineRate": 0.9262529229403715
          }
        },
        "riskLevels": [
          "safe",
          "safe",
          "risk"
        ],
        "riskPattern": "safe-safe-risk|risk-safe-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "safe",
              "risk"
            ],
            "riskPattern": "safe-safe-risk",
            "patternSamples": 95,
            "patternHits": 90,
            "predictedRate": 0.9436961605113688
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 95,
            "patternHits": 90,
            "predictedRate": 0.9436961605113688
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 92.6%（1348/1455），第1/2/3期结束 61/27/12%，当前连续遗漏3期以上状态。综合：一期58.6% / 两期81.5% / 三期91.5%，正向 1→2→3 安全→安全→风险（90/95）；反向 3→2→1 风险→安全→安全（90/95），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1333,
        "misses": 122,
        "rate": 0.9161512027491409,
        "baseline": 0.9139464082741379,
        "edge": 0.0022047944750029913,
        "stageShare": {
          "first": 0.6024006001500375,
          "second": 0.27081770442610653,
          "third": 0.12678169542385595
        },
        "stageCounts": {
          "first": 803,
          "second": 361,
          "third": 169
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 800,
            "hits": 734
          },
          "after_one_miss": {
            "n": 362,
            "hits": 330
          },
          "after_two_misses": {
            "n": 169,
            "hits": 152
          },
          "after_three_plus_misses": {
            "n": 118,
            "hits": 112
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 204,
          "rate": 0.8831168831168831
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 283,
          "rate": 0.9433333333333334
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 206,
          "rate": 0.8917748917748918,
          "baseline": 0.9075738715881736,
          "brier": 0.09793968741069586,
          "baselineBrier": 0.09682614881175577,
          "brierSkill": -0.01150039129517566
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 283,
          "rate": 0.9433333333333334,
          "baseline": 0.9091231678931992,
          "brier": 0.05532368019704454,
          "baselineBrier": 0.054692763223566615,
          "brierSkill": -0.011535657302574664
        }
      ],
      "current": {
        "target": 1468,
        "tail": 7,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 362,
        "hits": 330,
        "lineRate": 0.9160221368529694,
        "predictedRate": 0.913972297788578,
        "baseline": 0.9097624408886552,
        "edge": 0.004209856899922815,
        "lower": 0.8906031313624596,
        "upper": 0.9288922794632399,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5365346654169507,
            "baseline": 0.5514655760054533,
            "edge": -0.0149309105885026,
            "samples": 364,
            "hits": 195,
            "lineRate": 0.5514655760054533
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.814662194441313,
            "baseline": 0.7988168704918802,
            "edge": 0.015845323949432832,
            "samples": 363,
            "hits": 296,
            "lineRate": 0.8007810235511444
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.911833619730522,
            "baseline": 0.9097624408886552,
            "edge": 0.0020711788418668053,
            "samples": 362,
            "hits": 330,
            "lineRate": 0.9160221368529694
          }
        },
        "riskLevels": [
          "risk",
          "safe",
          "risk"
        ],
        "riskPattern": "risk-safe-risk|risk-safe-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "safe",
              "risk"
            ],
            "riskPattern": "risk-safe-risk",
            "patternSamples": 325,
            "patternHits": 297,
            "predictedRate": 0.913972297788578
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "safe",
              "risk"
            ],
            "riskPattern": "risk-safe-risk",
            "patternSamples": 325,
            "patternHits": 297,
            "predictedRate": 0.913972297788578
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1333/1455），第1/2/3期结束 60/27/13%，当前连续遗漏1期状态。综合：一期53.7% / 两期81.5% / 三期91.2%，正向 1→2→3 风险→安全→风险（297/325）；反向 3→2→1 风险→安全→风险（297/325），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1302,
        "misses": 153,
        "rate": 0.8948453608247423,
        "baseline": 0.8924343455516105,
        "edge": 0.0024110152731318113,
        "stageShare": {
          "first": 0.6098310291858678,
          "second": 0.27112135176651303,
          "third": 0.11904761904761904
        },
        "stageCounts": {
          "first": 794,
          "second": 353,
          "third": 155
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 4
          },
          "after_one_miss": {
            "n": 352,
            "hits": 314
          },
          "after_two_misses": {
            "n": 155,
            "hits": 134
          },
          "after_three_plus_misses": {
            "n": 152,
            "hits": 133
          },
          "after_hit": {
            "n": 790,
            "hits": 717
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 203,
          "rate": 0.8787878787878788
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 200,
          "rate": 0.8658008658008658
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 265,
          "rate": 0.8833333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 216,
          "rate": 0.935064935064935,
          "baseline": 0.9013688074555959,
          "brier": 0.0773558381195298,
          "baselineBrier": 0.0619397447428287,
          "brierSkill": -0.24888855194202186
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 265,
          "rate": 0.8833333333333333,
          "baseline": 0.9053789711029306,
          "brier": 0.11549050807596302,
          "baselineBrier": 0.10369521857871074,
          "brierSkill": -0.11374959866928647
        }
      ],
      "current": {
        "target": 1468,
        "tail": 8,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 155,
        "hits": 134,
        "lineRate": 0.8950708849976674,
        "predictedRate": 0.6397610126059475,
        "baseline": 0.9060088073845421,
        "edge": -0.2662477947785946,
        "lower": 0.8254944629079356,
        "upper": 0.8959122930344131,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.522196659850034,
            "baseline": 0.5453306066803,
            "edge": -0.023133946830265928,
            "samples": 156,
            "hits": 81,
            "lineRate": 0.5453306066802999
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7586201607575623,
            "baseline": 0.7932757427782959,
            "edge": -0.0346555820207336,
            "samples": 155,
            "hits": 117,
            "lineRate": 0.7879264066286713
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.8680081011425906,
            "baseline": 0.9060088073845421,
            "edge": -0.03800070624195151,
            "samples": 155,
            "hits": 134,
            "lineRate": 0.8950708849976674
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 277,
            "patternHits": 246,
            "predictedRate": 0.888556961952705
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 277,
            "patternHits": 246,
            "predictedRate": 0.888556961952705
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 89.5%（1302/1455），第1/2/3期结束 61/27/12%，当前连续遗漏2期状态。综合：一期52.2% / 两期75.9% / 三期86.8%，正向 1→2→3 风险→风险→风险（246/277）；反向 3→2→1 风险→风险→风险（246/277），最终判定：双向全风险·低分。"
      }
    },
    {
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1321,
        "misses": 134,
        "rate": 0.9079037800687285,
        "baseline": 0.906050744709686,
        "edge": 0.0018530353590424653,
        "stageShare": {
          "first": 0.6222558667676003,
          "second": 0.2626797880393641,
          "third": 0.11506434519303559
        },
        "stageCounts": {
          "first": 822,
          "second": 347,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 347,
            "hits": 316
          },
          "after_two_misses": {
            "n": 153,
            "hits": 138
          },
          "after_hit": {
            "n": 818,
            "hits": 736
          },
          "after_three_plus_misses": {
            "n": 131,
            "hits": 125
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 214,
          "rate": 0.9264069264069265
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 207,
          "rate": 0.8961038961038961
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 272,
          "rate": 0.9066666666666666
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 207,
          "rate": 0.8961038961038961,
          "baseline": 0.9113826452098265,
          "brier": 0.09470806440111307,
          "baselineBrier": 0.09345174707456448,
          "brierSkill": -0.013443486781966607
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 272,
          "rate": 0.9066666666666666,
          "baseline": 0.9136449052682697,
          "brier": 0.09384628899650348,
          "baselineBrier": 0.08466686570521062,
          "brierSkill": -0.10841813045558313
        }
      ],
      "current": {
        "target": 1468,
        "tail": 9,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 153,
        "hits": 138,
        "lineRate": 0.9080868798585651,
        "predictedRate": 0.660216398159258,
        "baseline": 0.9169672196656362,
        "edge": -0.2567508215063782,
        "lower": 0.8667984265059591,
        "upper": 0.9286055611193657,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.47557636007581044,
            "baseline": 0.5637355146557601,
            "edge": -0.08815915457994966,
            "samples": 153,
            "hits": 71,
            "lineRate": 0.5637355146557601
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7980360156286327,
            "baseline": 0.8096732988273255,
            "edge": -0.011637283198692838,
            "samples": 153,
            "hits": 122,
            "lineRate": 0.8030115351876727
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9026690034518573,
            "baseline": 0.9169672196656362,
            "edge": -0.014298216213778914,
            "samples": 153,
            "hits": 138,
            "lineRate": 0.9080868798585651
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 126,
            "patternHits": 118,
            "predictedRate": 0.9326146410765158
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 126,
            "patternHits": 118,
            "predictedRate": 0.9326146410765158
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 90.8%（1321/1455），第1/2/3期结束 62/26/12%，当前连续遗漏2期状态。综合：一期47.6% / 两期79.8% / 三期90.3%，正向 1→2→3 风险→风险→风险（118/126）；反向 3→2→1 风险→风险→风险（118/126），最终判定：双向全风险·低分。"
      }
    },
    {
      "id": "prob1",
      "label": "A",
      "kind": "probability",
      "longTerm": {
        "windows": 1455,
        "hits": 1335,
        "misses": 120,
        "rate": 0.9175257731958762,
        "baseline": 0.9063285127324238,
        "edge": 0.011197260463452485,
        "stageShare": {
          "first": 0.6202247191011236,
          "second": 0.2599250936329588,
          "third": 0.1198501872659176
        },
        "stageCounts": {
          "first": 828,
          "second": 347,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1285,
            "hits": 1180
          },
          "after_one_miss": {
            "n": 156,
            "hits": 142
          },
          "after_two_misses": {
            "n": 8,
            "hits": 7
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 218,
          "rate": 0.9437229437229437
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 272,
          "rate": 0.9066666666666666
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9091458273236181,
          "brier": 0.09899506251908886,
          "baselineBrier": 0.0900802956628338,
          "brierSkill": -0.09896467135967901
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 272,
          "rate": 0.9066666666666666,
          "baseline": 0.9073552565648684,
          "brier": 0.09403722059982005,
          "baselineBrier": 0.08558464088918318,
          "brierSkill": -0.0987628109765799
        }
      ],
      "current": {
        "target": 1468,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1285,
        "hits": 1180,
        "lineRate": 0.9174265017002489,
        "predictedRate": 0.9228940615436974,
        "baseline": 0.9126118341623196,
        "edge": 0.01028222738137774,
        "lower": 0.907965847013287,
        "upper": 0.9275447362243965,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5785551560726765,
            "baseline": 0.556237218813906,
            "edge": 0.022317937258770515,
            "samples": 1296,
            "hits": 750,
            "lineRate": 0.5689292695821091
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8115660091625685,
            "baseline": 0.8030745940339828,
            "edge": 0.008491415128585644,
            "samples": 1290,
            "hits": 1047,
            "lineRate": 0.8075736001482358
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9182747356582415,
            "baseline": 0.9126118341623196,
            "edge": 0.005662901495921857,
            "samples": 1285,
            "hits": 1180,
            "lineRate": 0.9174265017002489
          }
        },
        "riskLevels": [
          "safe",
          "safe",
          "safe"
        ],
        "riskPattern": "safe-safe-safe|safe-safe-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 598,
            "patternHits": 552,
            "predictedRate": 0.9228940615436974
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 598,
            "patternHits": 552,
            "predictedRate": 0.9228940615436974
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 91.8%（1335/1455），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.9% / 两期81.2% / 三期91.8%，正向 1→2→3 安全→安全→安全（552/598）；反向 3→2→1 安全→安全→安全（552/598），最终判定：双向全安全·高分。"
      }
    },
    {
      "id": "prob2",
      "label": "B",
      "kind": "probability",
      "longTerm": {
        "windows": 1455,
        "hits": 1315,
        "misses": 140,
        "rate": 0.9037800687285223,
        "baseline": 0.9080364550861683,
        "edge": -0.004256386357645914,
        "stageShare": {
          "first": 0.6197718631178707,
          "second": 0.2479087452471483,
          "third": 0.132319391634981
        },
        "stageCounts": {
          "first": 815,
          "second": 326,
          "third": 174
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1187,
            "hits": 1072
          },
          "after_one_miss": {
            "n": 236,
            "hits": 214
          },
          "after_two_misses": {
            "n": 26,
            "hits": 23
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 200,
          "rate": 0.8658008658008658
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 263,
          "rate": 0.8766666666666667
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 212,
          "rate": 0.9177489177489178,
          "baseline": 0.9060903825667974,
          "brier": 0.12276031508864256,
          "baselineBrier": 0.0773011018818723,
          "brierSkill": -0.588079756951444
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 263,
          "rate": 0.8766666666666667,
          "baseline": 0.9083778151186263,
          "brier": 0.14763249828342195,
          "baselineBrier": 0.10824457363686416,
          "brierSkill": -0.3638789763142798
        }
      ],
      "current": {
        "target": 1468,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1187,
        "hits": 1072,
        "lineRate": 0.9042281984833601,
        "predictedRate": 0.6523944500166879,
        "baseline": 0.9259624915929919,
        "edge": -0.273568041576304,
        "lower": 0.8915654228946583,
        "upper": 0.9135574807571165,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5603084572548247,
            "baseline": 0.580095432856169,
            "edge": -0.019786975601344348,
            "samples": 1194,
            "hits": 669,
            "lineRate": 0.5607233553678591
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7858935656840548,
            "baseline": 0.823680154491752,
            "edge": -0.03778658880769725,
            "samples": 1191,
            "hits": 936,
            "lineRate": 0.7858554021695189
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9031355128166257,
            "baseline": 0.9259624915929919,
            "edge": -0.02282697877636619,
            "samples": 1187,
            "hits": 1072,
            "lineRate": 0.9042281984833601
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 469,
            "patternHits": 425,
            "predictedRate": 0.9061034028009555
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 469,
            "patternHits": 425,
            "predictedRate": 0.9061034028009555
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 90.4%（1315/1455），第1/2/3期结束 62/25/13%，当前上一期开出状态。综合：一期56.0% / 两期78.6% / 三期90.3%，正向 1→2→3 风险→风险→风险（425/469）；反向 3→2→1 风险→风险→风险（425/469），最终判定：双向全风险·低分。"
      }
    },
    {
      "id": "prob3",
      "label": "C",
      "kind": "probability",
      "longTerm": {
        "windows": 1455,
        "hits": 1337,
        "misses": 118,
        "rate": 0.9189003436426116,
        "baseline": 0.9055388310767776,
        "edge": 0.013361512565834066,
        "stageShare": {
          "first": 0.599850411368736,
          "second": 0.27599102468212416,
          "third": 0.12415856394913986
        },
        "stageCounts": {
          "first": 802,
          "second": 369,
          "third": 166
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1131,
            "hits": 1033
          },
          "after_one_miss": {
            "n": 281,
            "hits": 263
          },
          "after_three_plus_misses": {
            "n": 3,
            "hits": 3
          },
          "after_two_misses": {
            "n": 34,
            "hits": 32
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 218,
          "rate": 0.9437229437229437
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 275,
          "rate": 0.9166666666666666
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 210,
          "rate": 0.9090909090909091,
          "baseline": 0.9037168837740432,
          "brier": 0.12718508489510802,
          "baselineBrier": 0.08323047752552463,
          "brierSkill": -0.5281071150421268
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 275,
          "rate": 0.9166666666666666,
          "baseline": 0.904683035021682,
          "brier": 0.12565300766101062,
          "baselineBrier": 0.07733895750151178,
          "brierSkill": -0.624705216107347
        }
      ],
      "current": {
        "target": 1468,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1131,
        "hits": 1033,
        "lineRate": 0.9187157395465722,
        "predictedRate": 0.6550289574398317,
        "baseline": 0.9097624408886552,
        "edge": -0.2547334834488235,
        "lower": 0.9020368609674162,
        "upper": 0.9234693199990774,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5503146616222432,
            "baseline": 0.5514655760054533,
            "edge": -0.0011509143832101332,
            "samples": 1143,
            "hits": 629,
            "lineRate": 0.5507975733334426
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7995528863890894,
            "baseline": 0.7988168704918802,
            "edge": 0.0007360158972091746,
            "samples": 1137,
            "hits": 909,
            "lineRate": 0.804134477608824
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9134442352657963,
            "baseline": 0.9097624408886552,
            "edge": 0.003681794377141112,
            "samples": 1131,
            "hits": 1033,
            "lineRate": 0.9187157395465722
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 1032,
            "patternHits": 944,
            "predictedRate": 0.914804481740429
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 1032,
            "patternHits": 944,
            "predictedRate": 0.914804481740429
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 91.9%（1337/1455），第1/2/3期结束 60/28/12%，当前上一期开出状态。综合：一期55.0% / 两期80.0% / 三期91.3%，正向 1→2→3 风险→风险→风险（944/1032）；反向 3→2→1 风险→风险→风险（944/1032），最终判定：双向全风险·低分。"
      }
    }
  ],
  "ranking": [
    {
      "rank": 1,
      "id": "tail6",
      "label": "尾6",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1348,
        "misses": 107,
        "rate": 0.9264604810996564,
        "baseline": 0.9169226439043533,
        "edge": 0.0095378371953031,
        "stageShare": {
          "first": 0.6097922848664689,
          "second": 0.2655786350148368,
          "third": 0.12462908011869436
        },
        "stageCounts": {
          "first": 822,
          "second": 358,
          "third": 168
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 818,
            "hits": 755
          },
          "after_one_miss": {
            "n": 360,
            "hits": 336
          },
          "after_two_misses": {
            "n": 168,
            "hits": 158
          },
          "after_three_plus_misses": {
            "n": 103,
            "hits": 94
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 211,
          "rate": 0.9134199134199135
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 282,
          "rate": 0.94
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.914101679464,
          "brier": 0.12076778505940321,
          "baselineBrier": 0.0898989285526357,
          "brierSkill": -0.3433729078171808
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 282,
          "rate": 0.94,
          "baseline": 0.9137388918144929,
          "brier": 0.10196848768640407,
          "baselineBrier": 0.05723353417270363,
          "brierSkill": -0.7816213721611458
        }
      ],
      "current": {
        "target": 1468,
        "tail": 6,
        "state": "after_three_plus_misses",
        "stateLabel": "连续遗漏3期以上",
        "samples": 103,
        "hits": 94,
        "lineRate": 0.9262529229403715,
        "predictedRate": 0.9436961605113688,
        "baseline": 0.9161863522150558,
        "edge": 0.027509808296313,
        "lower": 0.8702392728904409,
        "upper": 0.9420820164259096,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5859795501022496,
            "baseline": 0.5623721881390593,
            "edge": 0.023607361963190243,
            "samples": 105,
            "hits": 62,
            "lineRate": 0.5623721881390593
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.814584466904252,
            "baseline": 0.8084818982858051,
            "edge": 0.006102568618446935,
            "samples": 103,
            "hits": 84,
            "lineRate": 0.8096944714611497
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9148378736488408,
            "baseline": 0.9161863522150558,
            "edge": -0.0013484785662150056,
            "samples": 103,
            "hits": 94,
            "lineRate": 0.9262529229403715
          }
        },
        "riskLevels": [
          "safe",
          "safe",
          "risk"
        ],
        "riskPattern": "safe-safe-risk|risk-safe-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "safe",
              "risk"
            ],
            "riskPattern": "safe-safe-risk",
            "patternSamples": 95,
            "patternHits": 90,
            "predictedRate": 0.9436961605113688
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 95,
            "patternHits": 90,
            "predictedRate": 0.9436961605113688
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 92.6%（1348/1455），第1/2/3期结束 61/27/12%，当前连续遗漏3期以上状态。综合：一期58.6% / 两期81.5% / 三期91.5%，正向 1→2→3 安全→安全→风险（90/95）；反向 3→2→1 风险→安全→安全（90/95），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 2,
      "id": "prob1",
      "label": "A",
      "kind": "probability",
      "longTerm": {
        "windows": 1455,
        "hits": 1335,
        "misses": 120,
        "rate": 0.9175257731958762,
        "baseline": 0.9063285127324238,
        "edge": 0.011197260463452485,
        "stageShare": {
          "first": 0.6202247191011236,
          "second": 0.2599250936329588,
          "third": 0.1198501872659176
        },
        "stageCounts": {
          "first": 828,
          "second": 347,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1285,
            "hits": 1180
          },
          "after_one_miss": {
            "n": 156,
            "hits": 142
          },
          "after_two_misses": {
            "n": 8,
            "hits": 7
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 218,
          "rate": 0.9437229437229437
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 272,
          "rate": 0.9066666666666666
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9091458273236181,
          "brier": 0.09899506251908886,
          "baselineBrier": 0.0900802956628338,
          "brierSkill": -0.09896467135967901
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 272,
          "rate": 0.9066666666666666,
          "baseline": 0.9073552565648684,
          "brier": 0.09403722059982005,
          "baselineBrier": 0.08558464088918318,
          "brierSkill": -0.0987628109765799
        }
      ],
      "current": {
        "target": 1468,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1285,
        "hits": 1180,
        "lineRate": 0.9174265017002489,
        "predictedRate": 0.9228940615436974,
        "baseline": 0.9126118341623196,
        "edge": 0.01028222738137774,
        "lower": 0.907965847013287,
        "upper": 0.9275447362243965,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5785551560726765,
            "baseline": 0.556237218813906,
            "edge": 0.022317937258770515,
            "samples": 1296,
            "hits": 750,
            "lineRate": 0.5689292695821091
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8115660091625685,
            "baseline": 0.8030745940339828,
            "edge": 0.008491415128585644,
            "samples": 1290,
            "hits": 1047,
            "lineRate": 0.8075736001482358
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9182747356582415,
            "baseline": 0.9126118341623196,
            "edge": 0.005662901495921857,
            "samples": 1285,
            "hits": 1180,
            "lineRate": 0.9174265017002489
          }
        },
        "riskLevels": [
          "safe",
          "safe",
          "safe"
        ],
        "riskPattern": "safe-safe-safe|safe-safe-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 598,
            "patternHits": 552,
            "predictedRate": 0.9228940615436974
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 598,
            "patternHits": 552,
            "predictedRate": 0.9228940615436974
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 91.8%（1335/1455），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.9% / 两期81.2% / 三期91.8%，正向 1→2→3 安全→安全→安全（552/598）；反向 3→2→1 安全→安全→安全（552/598），最终判定：双向全安全·高分。"
      }
    },
    {
      "rank": 3,
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1333,
        "misses": 122,
        "rate": 0.9161512027491409,
        "baseline": 0.9383349028082042,
        "edge": -0.022183700059063338,
        "stageShare": {
          "first": 0.6316579144786196,
          "second": 0.25431357839459867,
          "third": 0.1140285071267817
        },
        "stageCounts": {
          "first": 842,
          "second": 339,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 838,
            "hits": 768
          },
          "after_one_miss": {
            "n": 338,
            "hits": 306
          },
          "after_two_misses": {
            "n": 151,
            "hits": 140
          },
          "after_three_plus_misses": {
            "n": 122,
            "hits": 113
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 215,
          "rate": 0.9307359307359307
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 222,
          "rate": 0.961038961038961
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 261,
          "rate": 0.87
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.9341438982351735,
          "brier": 0.10261221730845332,
          "baselineBrier": 0.07210203565371867,
          "brierSkill": -0.4231528469080206
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 261,
          "rate": 0.87,
          "baseline": 0.9285212843075097,
          "brier": 0.1316885087300816,
          "baselineBrier": 0.11664544148319526,
          "brierSkill": -0.12896403884804641
        }
      ],
      "current": {
        "target": 1468,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 838,
        "hits": 768,
        "lineRate": 0.9163494106045723,
        "predictedRate": 0.9173392209973998,
        "baseline": 0.9259624915929919,
        "edge": -0.008623270595592092,
        "lower": 0.9034059314344657,
        "upper": 0.927904308783228,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5970033548525069,
            "baseline": 0.580095432856169,
            "edge": 0.016907921996337838,
            "samples": 847,
            "hits": 506,
            "lineRate": 0.580095432856169
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.819319791986797,
            "baseline": 0.823680154491752,
            "edge": -0.004360362504954973,
            "samples": 842,
            "hits": 690,
            "lineRate": 0.8126830346309541
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9164650212262139,
            "baseline": 0.9259624915929919,
            "edge": -0.00949747036677806,
            "samples": 838,
            "hits": 768,
            "lineRate": 0.9163494106045723
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "risk"
        ],
        "riskPattern": "safe-risk-risk|risk-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 714,
            "patternHits": 655,
            "predictedRate": 0.9173392209973998
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "safe"
            ],
            "riskPattern": "risk-risk-safe",
            "patternSamples": 714,
            "patternHits": 655,
            "predictedRate": 0.9173392209973998
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1333/1455），第1/2/3期结束 63/25/11%，当前上一期开出状态。综合：一期59.7% / 两期81.9% / 三期91.6%，正向 1→2→3 安全→风险→风险（655/714）；反向 3→2→1 风险→风险→安全（655/714），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 4,
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1333,
        "misses": 122,
        "rate": 0.9161512027491409,
        "baseline": 0.9139464082741379,
        "edge": 0.0022047944750029913,
        "stageShare": {
          "first": 0.6024006001500375,
          "second": 0.27081770442610653,
          "third": 0.12678169542385595
        },
        "stageCounts": {
          "first": 803,
          "second": 361,
          "third": 169
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 800,
            "hits": 734
          },
          "after_one_miss": {
            "n": 362,
            "hits": 330
          },
          "after_two_misses": {
            "n": 169,
            "hits": 152
          },
          "after_three_plus_misses": {
            "n": 118,
            "hits": 112
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 204,
          "rate": 0.8831168831168831
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 283,
          "rate": 0.9433333333333334
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 206,
          "rate": 0.8917748917748918,
          "baseline": 0.9075738715881736,
          "brier": 0.09793968741069586,
          "baselineBrier": 0.09682614881175577,
          "brierSkill": -0.01150039129517566
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 283,
          "rate": 0.9433333333333334,
          "baseline": 0.9091231678931992,
          "brier": 0.05532368019704454,
          "baselineBrier": 0.054692763223566615,
          "brierSkill": -0.011535657302574664
        }
      ],
      "current": {
        "target": 1468,
        "tail": 7,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 362,
        "hits": 330,
        "lineRate": 0.9160221368529694,
        "predictedRate": 0.913972297788578,
        "baseline": 0.9097624408886552,
        "edge": 0.004209856899922815,
        "lower": 0.8906031313624596,
        "upper": 0.9288922794632399,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5365346654169507,
            "baseline": 0.5514655760054533,
            "edge": -0.0149309105885026,
            "samples": 364,
            "hits": 195,
            "lineRate": 0.5514655760054533
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.814662194441313,
            "baseline": 0.7988168704918802,
            "edge": 0.015845323949432832,
            "samples": 363,
            "hits": 296,
            "lineRate": 0.8007810235511444
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.911833619730522,
            "baseline": 0.9097624408886552,
            "edge": 0.0020711788418668053,
            "samples": 362,
            "hits": 330,
            "lineRate": 0.9160221368529694
          }
        },
        "riskLevels": [
          "risk",
          "safe",
          "risk"
        ],
        "riskPattern": "risk-safe-risk|risk-safe-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "safe",
              "risk"
            ],
            "riskPattern": "risk-safe-risk",
            "patternSamples": 325,
            "patternHits": 297,
            "predictedRate": 0.913972297788578
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "safe",
              "risk"
            ],
            "riskPattern": "risk-safe-risk",
            "patternSamples": 325,
            "patternHits": 297,
            "predictedRate": 0.913972297788578
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1333/1455），第1/2/3期结束 60/27/13%，当前连续遗漏1期状态。综合：一期53.7% / 两期81.5% / 三期91.2%，正向 1→2→3 风险→安全→风险（297/325）；反向 3→2→1 风险→安全→风险（297/325），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 5,
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1320,
        "misses": 135,
        "rate": 0.9072164948453608,
        "baseline": 0.9146298971692742,
        "edge": -0.0074134023239134095,
        "stageShare": {
          "first": 0.6113636363636363,
          "second": 0.2689393939393939,
          "third": 0.11969696969696969
        },
        "stageCounts": {
          "first": 807,
          "second": 355,
          "third": 158
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 354,
            "hits": 321
          },
          "after_hit": {
            "n": 804,
            "hits": 739
          },
          "after_two_misses": {
            "n": 156,
            "hits": 138
          },
          "after_three_plus_misses": {
            "n": 135,
            "hits": 116
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 211,
          "rate": 0.9134199134199135
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 218,
          "rate": 0.9437229437229437
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 256,
          "rate": 0.8533333333333334
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 219,
          "rate": 0.948051948051948,
          "baseline": 0.9191288645846455,
          "brier": 0.05656934295699548,
          "baselineBrier": 0.05014791876744616,
          "brierSkill": -0.12804966481914737
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 256,
          "rate": 0.8533333333333334,
          "baseline": 0.9157382402636237,
          "brier": 0.13210159204236205,
          "baselineBrier": 0.12904806738289987,
          "brierSkill": -0.02366191700029141
        }
      ],
      "current": {
        "target": 1468,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 804,
        "hits": 739,
        "lineRate": 0.9073254915992387,
        "predictedRate": 0.8977194182708694,
        "baseline": 0.9126118341623196,
        "edge": -0.014892415891450184,
        "lower": 0.905979152909441,
        "upper": 0.9306244647929922,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5638518562214881,
            "baseline": 0.556237218813906,
            "edge": 0.00761463740758217,
            "samples": 812,
            "hits": 458,
            "lineRate": 0.556237218813906
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8028743559757743,
            "baseline": 0.8030745940339828,
            "edge": -0.00020023805820856833,
            "samples": 807,
            "hits": 648,
            "lineRate": 0.7988546195982693
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9188671235825058,
            "baseline": 0.9126118341623196,
            "edge": 0.006255289420186161,
            "samples": 804,
            "hits": 739,
            "lineRate": 0.9073254915992387
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "safe"
        ],
        "riskPattern": "safe-risk-safe|safe-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 135,
            "patternHits": 121,
            "predictedRate": 0.8977194182708694
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 135,
            "patternHits": 121,
            "predictedRate": 0.8977194182708694
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.7%（1320/1455），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.4% / 两期80.3% / 三期91.9%，正向 1→2→3 安全→风险→安全（121/135）；反向 3→2→1 安全→风险→安全（121/135），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 6,
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1326,
        "misses": 129,
        "rate": 0.911340206185567,
        "baseline": 0.9115517189720117,
        "edge": -0.00021151278644471194,
        "stageShare": {
          "first": 0.6055806938159879,
          "second": 0.26772247360482654,
          "third": 0.12669683257918551
        },
        "stageCounts": {
          "first": 803,
          "second": 355,
          "third": 168
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 799,
            "hits": 729
          },
          "after_one_miss": {
            "n": 354,
            "hits": 325
          },
          "after_two_misses": {
            "n": 167,
            "hits": 151
          },
          "after_three_plus_misses": {
            "n": 129,
            "hits": 115
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 217,
          "rate": 0.9393939393939394
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 266,
          "rate": 0.8866666666666667
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9160271011339205,
          "brier": 0.10447428182733717,
          "baselineBrier": 0.08990699581094128,
          "brierSkill": -0.1620261680974009
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 266,
          "rate": 0.8866666666666667,
          "baseline": 0.9132781171162795,
          "brier": 0.11003753559632724,
          "baselineBrier": 0.10117576483122759,
          "brierSkill": -0.08758788015966146
        }
      ],
      "current": {
        "target": 1468,
        "tail": 5,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 799,
        "hits": 729,
        "lineRate": 0.911324904591722,
        "predictedRate": 0.8956552885745034,
        "baseline": 0.9105827772902393,
        "edge": -0.014927488715735904,
        "lower": 0.8987291506144186,
        "upper": 0.9243640210346054,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5569692228213596,
            "baseline": 0.5528289025221541,
            "edge": 0.004140320299205524,
            "samples": 806,
            "hits": 449,
            "lineRate": 0.5528289025221541
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7921453572025496,
            "baseline": 0.8000380095804589,
            "edge": -0.00789265237790926,
            "samples": 803,
            "hits": 636,
            "lineRate": 0.7967814488849188
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9123644665345964,
            "baseline": 0.9105827772902393,
            "edge": 0.0017816892443570653,
            "samples": 799,
            "hits": 729,
            "lineRate": 0.911324904591722
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "safe"
        ],
        "riskPattern": "safe-risk-safe|safe-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 112,
            "patternHits": 100,
            "predictedRate": 0.8956552885745034
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 112,
            "patternHits": 100,
            "predictedRate": 0.8956552885745034
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1326/1455），第1/2/3期结束 61/27/13%，当前上一期开出状态。综合：一期55.7% / 两期79.2% / 三期91.2%，正向 1→2→3 安全→风险→安全（100/112）；反向 3→2→1 安全→风险→安全（100/112），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 7,
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1312,
        "misses": 143,
        "rate": 0.9017182130584193,
        "baseline": 0.9051885251973293,
        "edge": -0.0034703121389100255,
        "stageShare": {
          "first": 0.5884146341463414,
          "second": 0.27515243902439024,
          "third": 0.1364329268292683
        },
        "stageCounts": {
          "first": 772,
          "second": 361,
          "third": 179
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 770,
            "hits": 697
          },
          "after_one_miss": {
            "n": 362,
            "hits": 323
          },
          "after_two_misses": {
            "n": 176,
            "hits": 160
          },
          "after_three_plus_misses": {
            "n": 141,
            "hits": 126
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 220,
          "rate": 0.9523809523809523
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 203,
          "rate": 0.8787878787878788
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 200,
          "rate": 0.8658008658008658
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 204,
          "rate": 0.8831168831168831
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 277,
          "rate": 0.9233333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 204,
          "rate": 0.8831168831168831,
          "baseline": 0.9002478996307975,
          "brier": 0.113625602845391,
          "baselineBrier": 0.10359967091892772,
          "brierSkill": -0.09677571209959845
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 277,
          "rate": 0.9233333333333333,
          "baseline": 0.8966125865323862,
          "brier": 0.07909829455706313,
          "baselineBrier": 0.07158415433711646,
          "brierSkill": -0.10496932302307838
        }
      ],
      "current": {
        "target": 1468,
        "tail": 4,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 770,
        "hits": 697,
        "lineRate": 0.9016289111975555,
        "predictedRate": 0.8939120556771786,
        "baseline": 0.8972977709456659,
        "edge": -0.0033857152684872993,
        "lower": 0.8908084321454841,
        "upper": 0.9178604987941892,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5322034507917913,
            "baseline": 0.5316973415132924,
            "edge": 0.000506109278498923,
            "samples": 776,
            "hits": 413,
            "lineRate": 0.5316973415132924
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7684248721047096,
            "baseline": 0.7806926200542821,
            "edge": -0.012267747949572527,
            "samples": 772,
            "hits": 593,
            "lineRate": 0.7796249353464979
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9051045293974064,
            "baseline": 0.8972977709456659,
            "edge": 0.007806758451740503,
            "samples": 770,
            "hits": 697,
            "lineRate": 0.9016289111975555
          }
        },
        "riskLevels": [
          "safe",
          "risk",
          "safe"
        ],
        "riskPattern": "safe-risk-safe|safe-risk-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 451,
            "patternHits": 403,
            "predictedRate": 0.8939120556771786
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 451,
            "patternHits": 403,
            "predictedRate": 0.8939120556771786
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.2%（1312/1455），第1/2/3期结束 59/28/14%，当前上一期开出状态。综合：一期53.2% / 两期76.8% / 三期90.5%，正向 1→2→3 安全→风险→安全（403/451）；反向 3→2→1 安全→风险→安全（403/451），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 8,
      "id": "tail0",
      "label": "尾0",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1219,
        "misses": 236,
        "rate": 0.8378006872852234,
        "baseline": 0.8209663575536037,
        "edge": 0.01683432973161969,
        "stageShare": {
          "first": 0.5660377358490566,
          "second": 0.29286300246103364,
          "third": 0.14109926168990977
        },
        "stageCounts": {
          "first": 690,
          "second": 357,
          "third": 172
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 359,
            "hits": 307
          },
          "after_two_misses": {
            "n": 172,
            "hits": 142
          },
          "after_hit": {
            "n": 689,
            "hits": 596
          },
          "after_three_plus_misses": {
            "n": 229,
            "hits": 168
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 176,
          "rate": 0.7619047619047619
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 179,
          "rate": 0.7748917748917749
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 188,
          "rate": 0.8138528138528138
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 195,
          "rate": 0.8441558441558441
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 268,
          "rate": 0.8933333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.8419641649355917,
          "brier": 0.1101646713851338,
          "baselineBrier": 0.07883755317389056,
          "brierSkill": -0.3973628930637356
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 268,
          "rate": 0.8933333333333333,
          "baseline": 0.8516367039601678,
          "brier": 0.11098674822045676,
          "baselineBrier": 0.09736475967495738,
          "brierSkill": -0.13990676494221366
        }
      ],
      "current": {
        "target": 1468,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 689,
        "hits": 596,
        "lineRate": 0.8381447413846264,
        "predictedRate": 0.8548313652056725,
        "baseline": 0.8548313652056725,
        "edge": 0,
        "lower": 0.8474903800519726,
        "upper": 0.880821280579698,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.48455645519808865,
            "baseline": 0.47443762781186094,
            "edge": 0.010118827386227713,
            "samples": 693,
            "hits": 336,
            "lineRate": 0.47443762781186094
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7526797125624771,
            "baseline": 0.723784192939976,
            "edge": 0.028895519622501142,
            "samples": 690,
            "hits": 520,
            "lineRate": 0.7201297959679406
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.864263603424108,
            "baseline": 0.8548313652056725,
            "edge": 0.009432238218435529,
            "samples": 689,
            "hits": 596,
            "lineRate": 0.8381447413846264
          }
        },
        "riskLevels": [
          "safe",
          "safe",
          "safe"
        ],
        "riskPattern": "safe-safe-safe|safe-safe-safe",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 543,
            "patternHits": 463,
            "predictedRate": 0.852154342500342
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 543,
            "patternHits": 463,
            "predictedRate": 0.852154342500342
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 83.8%（1219/1455），第1/2/3期结束 57/29/14%，当前上一期开出状态。综合：一期48.5% / 两期75.3% / 三期86.4%，正向 1→2→3 安全→安全→安全（463/543）；反向 3→2→1 安全→安全→安全（463/543），最终判定：双向全安全·高分。"
      }
    },
    {
      "rank": 9,
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1326,
        "misses": 129,
        "rate": 0.911340206185567,
        "baseline": 0.9096233751397476,
        "edge": 0.0017168310458194336,
        "stageShare": {
          "first": 0.6040723981900452,
          "second": 0.27526395173454,
          "third": 0.12066365007541478
        },
        "stageCounts": {
          "first": 801,
          "second": 365,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 365,
            "hits": 331
          },
          "after_hit": {
            "n": 797,
            "hits": 734
          },
          "after_two_misses": {
            "n": 160,
            "hits": 141
          },
          "after_three_plus_misses": {
            "n": 127,
            "hits": 114
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 205,
          "rate": 0.8874458874458875
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 280,
          "rate": 0.9333333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 209,
          "rate": 0.9047619047619048,
          "baseline": 0.9089090356805571,
          "brier": 0.08661951496485117,
          "baselineBrier": 0.08637437409156325,
          "brierSkill": -0.002838120401637223
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 280,
          "rate": 0.9333333333333333,
          "baseline": 0.910062194226245,
          "brier": 0.07081522956800419,
          "baselineBrier": 0.0627876249790443,
          "brierSkill": -0.12785329261361844
        }
      ],
      "current": {
        "target": 1468,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 797,
        "hits": 734,
        "lineRate": 0.9113083321391647,
        "predictedRate": 0.8424689916926348,
        "baseline": 0.9097624408886552,
        "edge": -0.06729344919602043,
        "lower": 0.9078388527396606,
        "upper": 0.9323411335970844,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5473656693205207,
            "baseline": 0.5514655760054533,
            "edge": -0.004099906684932653,
            "samples": 804,
            "hits": 440,
            "lineRate": 0.5514655760054533
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8002789698992127,
            "baseline": 0.7988168704918802,
            "edge": 0.00146209940733244,
            "samples": 801,
            "hits": 641,
            "lineRate": 0.8014517143626804
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9207174622310689,
            "baseline": 0.9097624408886552,
            "edge": 0.010955021342413662,
            "samples": 797,
            "hits": 734,
            "lineRate": 0.9113083321391647
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "safe"
        ],
        "riskPattern": "risk-risk-safe|safe-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "safe"
            ],
            "riskPattern": "risk-risk-safe",
            "patternSamples": 23,
            "patternHits": 18,
            "predictedRate": 0.8424689916926348
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 23,
            "patternHits": 18,
            "predictedRate": 0.8424689916926348
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1326/1455），第1/2/3期结束 60/28/12%，当前上一期开出状态。综合：一期54.7% / 两期80.0% / 三期92.1%，正向 1→2→3 风险→风险→安全（18/23）；反向 3→2→1 安全→风险→风险（18/23），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 10,
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1321,
        "misses": 134,
        "rate": 0.9079037800687285,
        "baseline": 0.906050744709686,
        "edge": 0.0018530353590424653,
        "stageShare": {
          "first": 0.6222558667676003,
          "second": 0.2626797880393641,
          "third": 0.11506434519303559
        },
        "stageCounts": {
          "first": 822,
          "second": 347,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 347,
            "hits": 316
          },
          "after_two_misses": {
            "n": 153,
            "hits": 138
          },
          "after_hit": {
            "n": 818,
            "hits": 736
          },
          "after_three_plus_misses": {
            "n": 131,
            "hits": 125
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 206,
          "rate": 0.8917748917748918
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 214,
          "rate": 0.9264069264069265
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 207,
          "rate": 0.8961038961038961
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 272,
          "rate": 0.9066666666666666
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 207,
          "rate": 0.8961038961038961,
          "baseline": 0.9113826452098265,
          "brier": 0.09470806440111307,
          "baselineBrier": 0.09345174707456448,
          "brierSkill": -0.013443486781966607
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 272,
          "rate": 0.9066666666666666,
          "baseline": 0.9136449052682697,
          "brier": 0.09384628899650348,
          "baselineBrier": 0.08466686570521062,
          "brierSkill": -0.10841813045558313
        }
      ],
      "current": {
        "target": 1468,
        "tail": 9,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 153,
        "hits": 138,
        "lineRate": 0.9080868798585651,
        "predictedRate": 0.660216398159258,
        "baseline": 0.9169672196656362,
        "edge": -0.2567508215063782,
        "lower": 0.8667984265059591,
        "upper": 0.9286055611193657,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.47557636007581044,
            "baseline": 0.5637355146557601,
            "edge": -0.08815915457994966,
            "samples": 153,
            "hits": 71,
            "lineRate": 0.5637355146557601
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7980360156286327,
            "baseline": 0.8096732988273255,
            "edge": -0.011637283198692838,
            "samples": 153,
            "hits": 122,
            "lineRate": 0.8030115351876727
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9026690034518573,
            "baseline": 0.9169672196656362,
            "edge": -0.014298216213778914,
            "samples": 153,
            "hits": 138,
            "lineRate": 0.9080868798585651
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 126,
            "patternHits": 118,
            "predictedRate": 0.9326146410765158
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 126,
            "patternHits": 118,
            "predictedRate": 0.9326146410765158
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 90.8%（1321/1455），第1/2/3期结束 62/26/12%，当前连续遗漏2期状态。综合：一期47.6% / 两期79.8% / 三期90.3%，正向 1→2→3 风险→风险→风险（118/126）；反向 3→2→1 风险→风险→风险（118/126），最终判定：双向全风险·低分。"
      }
    },
    {
      "rank": 11,
      "id": "prob3",
      "label": "C",
      "kind": "probability",
      "longTerm": {
        "windows": 1455,
        "hits": 1337,
        "misses": 118,
        "rate": 0.9189003436426116,
        "baseline": 0.9055388310767776,
        "edge": 0.013361512565834066,
        "stageShare": {
          "first": 0.599850411368736,
          "second": 0.27599102468212416,
          "third": 0.12415856394913986
        },
        "stageCounts": {
          "first": 802,
          "second": 369,
          "third": 166
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1131,
            "hits": 1033
          },
          "after_one_miss": {
            "n": 281,
            "hits": 263
          },
          "after_three_plus_misses": {
            "n": 3,
            "hits": 3
          },
          "after_two_misses": {
            "n": 34,
            "hits": 32
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 213,
          "rate": 0.922077922077922
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 218,
          "rate": 0.9437229437229437
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 275,
          "rate": 0.9166666666666666
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 210,
          "rate": 0.9090909090909091,
          "baseline": 0.9037168837740432,
          "brier": 0.12718508489510802,
          "baselineBrier": 0.08323047752552463,
          "brierSkill": -0.5281071150421268
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 275,
          "rate": 0.9166666666666666,
          "baseline": 0.904683035021682,
          "brier": 0.12565300766101062,
          "baselineBrier": 0.07733895750151178,
          "brierSkill": -0.624705216107347
        }
      ],
      "current": {
        "target": 1468,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1131,
        "hits": 1033,
        "lineRate": 0.9187157395465722,
        "predictedRate": 0.6550289574398317,
        "baseline": 0.9097624408886552,
        "edge": -0.2547334834488235,
        "lower": 0.9020368609674162,
        "upper": 0.9234693199990774,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5503146616222432,
            "baseline": 0.5514655760054533,
            "edge": -0.0011509143832101332,
            "samples": 1143,
            "hits": 629,
            "lineRate": 0.5507975733334426
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7995528863890894,
            "baseline": 0.7988168704918802,
            "edge": 0.0007360158972091746,
            "samples": 1137,
            "hits": 909,
            "lineRate": 0.804134477608824
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9134442352657963,
            "baseline": 0.9097624408886552,
            "edge": 0.003681794377141112,
            "samples": 1131,
            "hits": 1033,
            "lineRate": 0.9187157395465722
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 1032,
            "patternHits": 944,
            "predictedRate": 0.914804481740429
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 1032,
            "patternHits": 944,
            "predictedRate": 0.914804481740429
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 91.9%（1337/1455），第1/2/3期结束 60/28/12%，当前上一期开出状态。综合：一期55.0% / 两期80.0% / 三期91.3%，正向 1→2→3 风险→风险→风险（944/1032）；反向 3→2→1 风险→风险→风险（944/1032），最终判定：双向全风险·低分。"
      }
    },
    {
      "rank": 12,
      "id": "prob2",
      "label": "B",
      "kind": "probability",
      "longTerm": {
        "windows": 1455,
        "hits": 1315,
        "misses": 140,
        "rate": 0.9037800687285223,
        "baseline": 0.9080364550861683,
        "edge": -0.004256386357645914,
        "stageShare": {
          "first": 0.6197718631178707,
          "second": 0.2479087452471483,
          "third": 0.132319391634981
        },
        "stageCounts": {
          "first": 815,
          "second": 326,
          "third": 174
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1187,
            "hits": 1072
          },
          "after_one_miss": {
            "n": 236,
            "hits": 214
          },
          "after_two_misses": {
            "n": 26,
            "hits": 23
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 219,
          "rate": 0.948051948051948
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 209,
          "rate": 0.9047619047619048
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 200,
          "rate": 0.8658008658008658
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 212,
          "rate": 0.9177489177489178
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 263,
          "rate": 0.8766666666666667
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 212,
          "rate": 0.9177489177489178,
          "baseline": 0.9060903825667974,
          "brier": 0.12276031508864256,
          "baselineBrier": 0.0773011018818723,
          "brierSkill": -0.588079756951444
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 263,
          "rate": 0.8766666666666667,
          "baseline": 0.9083778151186263,
          "brier": 0.14763249828342195,
          "baselineBrier": 0.10824457363686416,
          "brierSkill": -0.3638789763142798
        }
      ],
      "current": {
        "target": 1468,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1187,
        "hits": 1072,
        "lineRate": 0.9042281984833601,
        "predictedRate": 0.6523944500166879,
        "baseline": 0.9259624915929919,
        "edge": -0.273568041576304,
        "lower": 0.8915654228946583,
        "upper": 0.9135574807571165,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5603084572548247,
            "baseline": 0.580095432856169,
            "edge": -0.019786975601344348,
            "samples": 1194,
            "hits": 669,
            "lineRate": 0.5607233553678591
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7858935656840548,
            "baseline": 0.823680154491752,
            "edge": -0.03778658880769725,
            "samples": 1191,
            "hits": 936,
            "lineRate": 0.7858554021695189
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9031355128166257,
            "baseline": 0.9259624915929919,
            "edge": -0.02282697877636619,
            "samples": 1187,
            "hits": 1072,
            "lineRate": 0.9042281984833601
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 469,
            "patternHits": 425,
            "predictedRate": 0.9061034028009555
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 469,
            "patternHits": 425,
            "predictedRate": 0.9061034028009555
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 90.4%（1315/1455），第1/2/3期结束 62/25/13%，当前上一期开出状态。综合：一期56.0% / 两期78.6% / 三期90.3%，正向 1→2→3 风险→风险→风险（425/469）；反向 3→2→1 风险→风险→风险（425/469），最终判定：双向全风险·低分。"
      }
    },
    {
      "rank": 13,
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 1455,
        "hits": 1302,
        "misses": 153,
        "rate": 0.8948453608247423,
        "baseline": 0.8924343455516105,
        "edge": 0.0024110152731318113,
        "stageShare": {
          "first": 0.6098310291858678,
          "second": 0.27112135176651303,
          "third": 0.11904761904761904
        },
        "stageCounts": {
          "first": 794,
          "second": 353,
          "third": 155
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 4
          },
          "after_one_miss": {
            "n": 352,
            "hits": 314
          },
          "after_two_misses": {
            "n": 155,
            "hits": 134
          },
          "after_three_plus_misses": {
            "n": 152,
            "hits": 133
          },
          "after_hit": {
            "n": 790,
            "hits": 717
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 231,
          "hits": 203,
          "rate": 0.8787878787878788
        },
        {
          "year": 2022,
          "windows": 231,
          "hits": 210,
          "rate": 0.9090909090909091
        },
        {
          "year": 2023,
          "windows": 231,
          "hits": 208,
          "rate": 0.9004329004329005
        },
        {
          "year": 2024,
          "windows": 231,
          "hits": 200,
          "rate": 0.8658008658008658
        },
        {
          "year": 2025,
          "windows": 231,
          "hits": 216,
          "rate": 0.935064935064935
        },
        {
          "year": 2026,
          "windows": 300,
          "hits": 265,
          "rate": 0.8833333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 216,
          "rate": 0.935064935064935,
          "baseline": 0.9013688074555959,
          "brier": 0.0773558381195298,
          "baselineBrier": 0.0619397447428287,
          "brierSkill": -0.24888855194202186
        },
        {
          "year": 2026,
          "predictions": 300,
          "hits": 265,
          "rate": 0.8833333333333333,
          "baseline": 0.9053789711029306,
          "brier": 0.11549050807596302,
          "baselineBrier": 0.10369521857871074,
          "brierSkill": -0.11374959866928647
        }
      ],
      "current": {
        "target": 1468,
        "tail": 8,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 155,
        "hits": 134,
        "lineRate": 0.8950708849976674,
        "predictedRate": 0.6397610126059475,
        "baseline": 0.9060088073845421,
        "edge": -0.2662477947785946,
        "lower": 0.8254944629079356,
        "upper": 0.8959122930344131,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.522196659850034,
            "baseline": 0.5453306066803,
            "edge": -0.023133946830265928,
            "samples": 156,
            "hits": 81,
            "lineRate": 0.5453306066802999
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7586201607575623,
            "baseline": 0.7932757427782959,
            "edge": -0.0346555820207336,
            "samples": 155,
            "hits": 117,
            "lineRate": 0.7879264066286713
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.8680081011425906,
            "baseline": 0.9060088073845421,
            "edge": -0.03800070624195151,
            "samples": 155,
            "hits": 134,
            "lineRate": 0.8950708849976674
          }
        },
        "riskLevels": [
          "risk",
          "risk",
          "risk"
        ],
        "riskPattern": "risk-risk-risk|risk-risk-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 277,
            "patternHits": 246,
            "predictedRate": 0.888556961952705
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 277,
            "patternHits": 246,
            "predictedRate": 0.888556961952705
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 89.5%（1302/1455），第1/2/3期结束 61/27/12%，当前连续遗漏2期状态。综合：一期52.2% / 两期75.9% / 三期86.8%，正向 1→2→3 风险→风险→风险（246/277）；反向 3→2→1 风险→风险→风险（246/277），最终判定：双向全风险·低分。"
      }
    }
  ],
  "selectionValidation": [
    {
      "year": 2025,
      "periods": 231,
      "all": {
        "n": 3003,
        "hits": 2733,
        "rate": 0.9100899100899101
      },
      "top2": {
        "n": 462,
        "hits": 414,
        "rate": 0.8961038961038961
      },
      "top3": {
        "n": 693,
        "hits": 621,
        "rate": 0.8961038961038961
      },
      "top2Lift": -0.013986013986014068,
      "top3Lift": -0.013986013986014068
    },
    {
      "year": 2026,
      "periods": 300,
      "all": {
        "n": 3900,
        "hits": 3520,
        "rate": 0.9025641025641026
      },
      "top2": {
        "n": 600,
        "hits": 534,
        "rate": 0.89
      },
      "top3": {
        "n": 900,
        "hits": 801,
        "rate": 0.89
      },
      "top2Lift": -0.012564102564102564,
      "top3Lift": -0.012564102564102564
    }
  ],
  "review": {
    "policy": {
      "maxPeriods": 30,
      "maxDays": 30,
      "trigger": "whichever-first"
    },
    "status": "waiting",
    "dueNow": false,
    "reviewNumber": 1,
    "lastReviewedPeriod": 1466,
    "lastReviewedAt": "2026-10-28T17:10:58.197Z",
    "nextReviewPeriod": 1496,
    "nextReviewAt": "2026-11-27T17:10:58.197Z",
    "periodsUntilReview": 29,
    "daysUntilReview": 30,
    "metrics": {
      "meanLongTermRate": 0.9054597397100836,
      "meanCurrentPrediction": 0.802928114190107,
      "meanBrierSkill": -0.22269427309457893,
      "selectionTop2": 0.8928680015636536,
      "selectionTop3": 0.8934254151645455,
      "selectionAll": 0.9062927039515669
    },
    "previousMetrics": null,
    "observedMetrics": {
      "meanLongTermRate": 0.9054718477398892,
      "meanCurrentPrediction": 0.8222992060372021,
      "meanBrierSkill": -0.22146835635203235,
      "selectionTop2": 0.8930519480519481,
      "selectionTop3": 0.8930519480519481,
      "selectionAll": 0.9063270063270064
    },
    "candidateOnly": false,
    "ruleReplacement": "hold-current"
  }
};
