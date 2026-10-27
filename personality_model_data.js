window.APP_PERSONALITY_MODEL = {
  "version": "next-window-v7-20261026",
  "method": "per-line-dual-direction-risk-cascade-v6",
  "generatedAt": "2026-10-27T14:16:15.390Z",
  "asOfPeriod": 1465,
  "target": 1466,
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
        "windows": 1453,
        "hits": 1218,
        "misses": 235,
        "rate": 0.8382656572608397,
        "baseline": 0.8209192292808023,
        "edge": 0.017346427980037382,
        "stageShare": {
          "first": 0.5665024630541872,
          "second": 0.29310344827586204,
          "third": 0.14039408866995073
        },
        "stageCounts": {
          "first": 690,
          "second": 357,
          "third": 171
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 358,
            "hits": 306
          },
          "after_two_misses": {
            "n": 172,
            "hits": 142
          },
          "after_hit": {
            "n": 688,
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
          "windows": 298,
          "hits": 267,
          "rate": 0.8959731543624161
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
          "predictions": 298,
          "hits": 267,
          "rate": 0.8959731543624161,
          "baseline": 0.8516127553441704,
          "brier": 0.10921793153965823,
          "baselineBrier": 0.0954926784887028,
          "brierSkill": -0.14373094637385408
        }
      ],
      "current": {
        "target": 1466,
        "tail": 0,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 172,
        "hits": 142,
        "lineRate": 0.8386001843347562,
        "predictedRate": 0.5823640734203824,
        "baseline": 0.8548024456147842,
        "edge": -0.2724383721944018,
        "lower": 0.7855208215493663,
        "upper": 0.859497791844906,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.4660836177474403,
            "baseline": 0.4744027303754266,
            "edge": -0.008319112627986291,
            "samples": 172,
            "hits": 80,
            "lineRate": 0.4744027303754266
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7000442428716767,
            "baseline": 0.7237475101631934,
            "edge": -0.023703267291516728,
            "samples": 172,
            "hits": 120,
            "lineRate": 0.7204247315680965
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.826937519201537,
            "baseline": 0.8548024456147842,
            "edge": -0.027864926413247226,
            "samples": 172,
            "hits": 142,
            "lineRate": 0.8386001843347562
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
            "patternSamples": 452,
            "patternHits": 365,
            "predictedRate": 0.8088389908616422
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 452,
            "patternHits": 365,
            "predictedRate": 0.8088389908616422
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 83.8%（1218/1453），第1/2/3期结束 57/29/14%，当前连续遗漏2期状态。综合：一期46.6% / 两期70.0% / 三期82.7%，正向 1→2→3 风险→风险→风险（365/452）；反向 3→2→1 风险→风险→风险（365/452），最终判定：双向全风险·低分。"
      }
    },
    {
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1324,
        "misses": 129,
        "rate": 0.9112181693048864,
        "baseline": 0.9096237920407555,
        "edge": 0.0015943772641309195,
        "stageShare": {
          "first": 0.6042296072507553,
          "second": 0.27492447129909364,
          "third": 0.12084592145015106
        },
        "stageCounts": {
          "first": 800,
          "second": 364,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 364,
            "hits": 330
          },
          "after_hit": {
            "n": 796,
            "hits": 733
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
          "windows": 298,
          "hits": 278,
          "rate": 0.9328859060402684
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
          "predictions": 298,
          "hits": 278,
          "rate": 0.9328859060402684,
          "baseline": 0.9100671720629475,
          "brier": 0.07117936402008855,
          "baselineBrier": 0.06315383195658732,
          "brierSkill": -0.12707909900096137
        }
      ],
      "current": {
        "target": 1466,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 796,
        "hits": 733,
        "lineRate": 0.9111812345752008,
        "predictedRate": 0.8386577307500955,
        "baseline": 0.9093923625007588,
        "edge": -0.0707346317506633,
        "lower": 0.9077239669414734,
        "upper": 0.9322556528962875,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5462494706160783,
            "baseline": 0.5508532423208191,
            "edge": -0.0046037717047408,
            "samples": 802,
            "hits": 438,
            "lineRate": 0.5508532423208191
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.80002863299484,
            "baseline": 0.7982671900662792,
            "edge": 0.0017614429285607303,
            "samples": 800,
            "hits": 640,
            "lineRate": 0.8011739527884408
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9206171871219412,
            "baseline": 0.9093923625007588,
            "edge": 0.01122482462118235,
            "samples": 796,
            "hits": 733,
            "lineRate": 0.9111812345752008
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
            "patternSamples": 22,
            "patternHits": 17,
            "predictedRate": 0.8386577307500955
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 22,
            "patternHits": 17,
            "predictedRate": 0.8386577307500955
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1324/1453），第1/2/3期结束 60/27/12%，当前上一期开出状态。综合：一期54.6% / 两期80.0% / 三期92.1%，正向 1→2→3 风险→风险→安全（17/22）；反向 3→2→1 安全→风险→风险（17/22），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1331,
        "misses": 122,
        "rate": 0.9160357880247764,
        "baseline": 0.9383526659505848,
        "edge": -0.022316877925808387,
        "stageShare": {
          "first": 0.6311044327573253,
          "second": 0.25469571750563486,
          "third": 0.11419984973703982
        },
        "stageCounts": {
          "first": 840,
          "second": 339,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 837,
            "hits": 767
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
            "n": 121,
            "hits": 112
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
          "windows": 298,
          "hits": 259,
          "rate": 0.8691275167785235
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
          "predictions": 298,
          "hits": 259,
          "rate": 0.8691275167785235,
          "baseline": 0.9285420313171666,
          "brier": 0.13253083132855073,
          "baselineBrier": 0.11739097670292203,
          "brierSkill": -0.12896949195629137
        }
      ],
      "current": {
        "target": 1466,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 837,
        "hits": 767,
        "lineRate": 0.9162304555392065,
        "predictedRate": 0.91722320478961,
        "baseline": 0.9256588521547695,
        "edge": -0.00843564736515956,
        "lower": 0.9032914153148595,
        "upper": 0.9278176777102154,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5960583164000078,
            "baseline": 0.5795221843003413,
            "edge": 0.016536132099666534,
            "samples": 845,
            "hits": 504,
            "lineRate": 0.5795221843003413
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8188935285456936,
            "baseline": 0.8231984065044439,
            "edge": -0.004304877958750231,
            "samples": 840,
            "hits": 688,
            "lineRate": 0.8124217274648309
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9163647714244855,
            "baseline": 0.9256588521547695,
            "edge": -0.009294080730284038,
            "samples": 837,
            "hits": 767,
            "lineRate": 0.9162304555392065
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
            "patternSamples": 713,
            "patternHits": 654,
            "predictedRate": 0.91722320478961
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "safe"
            ],
            "riskPattern": "risk-risk-safe",
            "patternSamples": 713,
            "patternHits": 654,
            "predictedRate": 0.91722320478961
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1331/1453），第1/2/3期结束 63/25/11%，当前上一期开出状态。综合：一期59.6% / 两期81.9% / 三期91.6%，正向 1→2→3 安全→风险→风险（654/713）；反向 3→2→1 风险→风险→安全（654/713），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1318,
        "misses": 135,
        "rate": 0.9070887818306951,
        "baseline": 0.9146335401132302,
        "edge": -0.007544758282535091,
        "stageShare": {
          "first": 0.6107738998482549,
          "second": 0.26934749620637327,
          "third": 0.11987860394537178
        },
        "stageCounts": {
          "first": 805,
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
            "n": 802,
            "hits": 737
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
          "windows": 298,
          "hits": 254,
          "rate": 0.8523489932885906
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
          "predictions": 298,
          "hits": 254,
          "rate": 0.8523489932885906,
          "baseline": 0.9157634412158275,
          "brier": 0.13295974354370987,
          "baselineBrier": 0.12986216885593066,
          "brierSkill": -0.023852787267211406
        }
      ],
      "current": {
        "target": 1466,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 802,
        "hits": 737,
        "lineRate": 0.9071932591014827,
        "predictedRate": 0.8977023560130946,
        "baseline": 0.912253441583299,
        "edge": -0.014551085570204458,
        "lower": 0.905746510626965,
        "upper": 0.9304504655254936,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5627862987787327,
            "baseline": 0.5556313993174061,
            "edge": 0.007154899461326525,
            "samples": 810,
            "hits": 456,
            "lineRate": 0.5556313993174061
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8023896631280188,
            "baseline": 0.8025365467273935,
            "edge": -0.00014688359937464757,
            "samples": 805,
            "hits": 646,
            "lineRate": 0.7985736040307736
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9186665026545373,
            "baseline": 0.912253441583299,
            "edge": 0.006413061071238291,
            "samples": 802,
            "hits": 737,
            "lineRate": 0.9071932591014827
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
            "predictedRate": 0.8977023560130946
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
            "predictedRate": 0.8977023560130946
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.7%（1318/1453），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.3% / 两期80.2% / 三期91.9%，正向 1→2→3 安全→风险→安全（121/135）；反向 3→2→1 安全→风险→安全（121/135），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1311,
        "misses": 142,
        "rate": 0.9022711631108052,
        "baseline": 0.9051988544562679,
        "edge": -0.0029276913454626685,
        "stageShare": {
          "first": 0.5888634630053394,
          "second": 0.2753623188405797,
          "third": 0.13577421815408086
        },
        "stageCounts": {
          "first": 772,
          "second": 361,
          "third": 178
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 769,
            "hits": 697
          },
          "after_one_miss": {
            "n": 361,
            "hits": 322
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
          "windows": 298,
          "hits": 276,
          "rate": 0.9261744966442953
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
          "predictions": 298,
          "hits": 276,
          "rate": 0.9261744966442953,
          "baseline": 0.8966053936998626,
          "brier": 0.07688862819636831,
          "baselineBrier": 0.06932450318093512,
          "brierSkill": -0.1091118532171953
        }
      ],
      "current": {
        "target": 1466,
        "tail": 4,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 176,
        "hits": 160,
        "lineRate": 0.902171130919665,
        "predictedRate": 0.8958370694008368,
        "baseline": 0.8973262384621112,
        "edge": -0.0014891690612743869,
        "lower": 0.8774522513337522,
        "upper": 0.9331832869282453,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5890647085186335,
            "baseline": 0.531740614334471,
            "edge": 0.05732409418416251,
            "samples": 178,
            "hits": 106,
            "lineRate": 0.531740614334471
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7796955674562415,
            "baseline": 0.7807331477361413,
            "edge": -0.0010375802798998635,
            "samples": 177,
            "hits": 138,
            "lineRate": 0.7800013394439786
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9083848092775169,
            "baseline": 0.8973262384621112,
            "edge": 0.011058570815405622,
            "samples": 176,
            "hits": 160,
            "lineRate": 0.902171130919665
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
            "patternSamples": 450,
            "patternHits": 403,
            "predictedRate": 0.8958370694008368
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 450,
            "patternHits": 403,
            "predictedRate": 0.8958370694008368
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.2%（1311/1453），第1/2/3期结束 59/28/14%，当前连续遗漏2期状态。综合：一期58.9% / 两期78.0% / 三期90.8%，正向 1→2→3 安全→风险→安全（403/450）；反向 3→2→1 安全→风险→安全（403/450），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1324,
        "misses": 129,
        "rate": 0.9112181693048864,
        "baseline": 0.9115528075575987,
        "edge": -0.00033463825271229375,
        "stageShare": {
          "first": 0.6057401812688822,
          "second": 0.2681268882175227,
          "third": 0.12613293051359517
        },
        "stageCounts": {
          "first": 802,
          "second": 355,
          "third": 167
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 798,
            "hits": 728
          },
          "after_one_miss": {
            "n": 353,
            "hits": 324
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
          "windows": 298,
          "hits": 264,
          "rate": 0.8859060402684564
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
          "predictions": 298,
          "hits": 264,
          "rate": 0.8859060402684564,
          "baseline": 0.913295011448986,
          "brier": 0.11071491390132314,
          "baselineBrier": 0.10180134961399862,
          "brierSkill": -0.08755840979635532
        }
      ],
      "current": {
        "target": 1466,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 353,
        "hits": 324,
        "lineRate": 0.911206190861295,
        "predictedRate": 0.9153915484584496,
        "baseline": 0.9106260349100137,
        "edge": 0.004765513548435907,
        "lower": 0.8971526491068075,
        "upper": 0.9346805646681248,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5333103991453997,
            "baseline": 0.552901023890785,
            "edge": -0.01959062474538531,
            "samples": 357,
            "hits": 190,
            "lineRate": 0.552901023890785
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8025163402790907,
            "baseline": 0.8001025055620916,
            "edge": 0.002413834716999075,
            "samples": 355,
            "hits": 285,
            "lineRate": 0.7971813802329502
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9174909485716513,
            "baseline": 0.9106260349100137,
            "edge": 0.006864913661637551,
            "samples": 353,
            "hits": 324,
            "lineRate": 0.911206190861295
          }
        },
        "riskLevels": [
          "risk",
          "safe",
          "safe"
        ],
        "riskPattern": "risk-safe-safe|safe-safe-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 131,
            "patternHits": 120,
            "predictedRate": 0.9153915484584496
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "risk"
            ],
            "riskPattern": "safe-safe-risk",
            "patternSamples": 131,
            "patternHits": 120,
            "predictedRate": 0.9153915484584496
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1324/1453），第1/2/3期结束 61/27/13%，当前连续遗漏1期状态。综合：一期53.3% / 两期80.3% / 三期91.7%，正向 1→2→3 风险→安全→安全（120/131）；反向 3→2→1 安全→安全→风险（120/131），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail6",
      "label": "尾6",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1348,
        "misses": 105,
        "rate": 0.9277357192016518,
        "baseline": 0.9169225970229169,
        "edge": 0.010813122178734869,
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
            "n": 817,
            "hits": 755
          },
          "after_one_miss": {
            "n": 359,
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
          "windows": 298,
          "hits": 282,
          "rate": 0.9463087248322147
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
          "predictions": 298,
          "hits": 282,
          "rate": 0.9463087248322147,
          "baseline": 0.9137172957644698,
          "brier": 0.09832411024214739,
          "baselineBrier": 0.05197463434995248,
          "brierSkill": -0.8917710816418141
        }
      ],
      "current": {
        "target": 1466,
        "tail": 6,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 168,
        "hits": 158,
        "lineRate": 0.9275109916899376,
        "predictedRate": 0.9450011570199933,
        "baseline": 0.9166266892059107,
        "edge": 0.028374467814082593,
        "lower": 0.9125836550230668,
        "upper": 0.9598603199260012,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.6204380880148798,
            "baseline": 0.5631399317406144,
            "edge": 0.05729815627426538,
            "samples": 169,
            "hits": 106,
            "lineRate": 0.5631399317406143
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8582852451254749,
            "baseline": 0.8091532807604049,
            "edge": 0.04913196436506995,
            "samples": 169,
            "hits": 146,
            "lineRate": 0.8107955664357369
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9390969140095677,
            "baseline": 0.9166266892059107,
            "edge": 0.022470224803657013,
            "samples": 168,
            "hits": 158,
            "lineRate": 0.9275109916899376
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
            "patternSamples": 170,
            "patternHits": 161,
            "predictedRate": 0.9450011570199933
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 170,
            "patternHits": 161,
            "predictedRate": 0.9450011570199933
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 92.8%（1348/1453），第1/2/3期结束 61/27/12%，当前连续遗漏2期状态。综合：一期62.0% / 两期85.8% / 三期93.9%，正向 1→2→3 安全→安全→安全（161/170）；反向 3→2→1 安全→安全→安全（161/170），最终判定：双向全安全·高分。"
      }
    },
    {
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1331,
        "misses": 122,
        "rate": 0.9160357880247764,
        "baseline": 0.9139522070271211,
        "edge": 0.0020835809976552655,
        "stageShare": {
          "first": 0.6025544703230654,
          "second": 0.270473328324568,
          "third": 0.12697220135236664
        },
        "stageCounts": {
          "first": 802,
          "second": 360,
          "third": 169
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 799,
            "hits": 733
          },
          "after_one_miss": {
            "n": 361,
            "hits": 329
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
          "windows": 298,
          "hits": 281,
          "rate": 0.9429530201342282
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
          "predictions": 298,
          "hits": 281,
          "rate": 0.9429530201342282,
          "baseline": 0.9091190709379069,
          "brier": 0.05564877580824333,
          "baselineBrier": 0.055005143961083997,
          "brierSkill": -0.011701302838416305
        }
      ],
      "current": {
        "target": 1466,
        "tail": 7,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 799,
        "hits": 733,
        "lineRate": 0.9159097405205051,
        "predictedRate": 0.9204773443094391,
        "baseline": 0.9098048397303035,
        "edge": 0.0106725045791356,
        "lower": 0.9040604850376484,
        "upper": 0.9290247129743379,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5485809668975115,
            "baseline": 0.5515358361774744,
            "edge": -0.002954869279962913,
            "samples": 804,
            "hits": 441,
            "lineRate": 0.5515358361774744
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7919833261731696,
            "baseline": 0.7988798937669629,
            "edge": -0.006896567593793312,
            "samples": 802,
            "hits": 635,
            "lineRate": 0.8005147057172659
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9173604332239439,
            "baseline": 0.9098048397303035,
            "edge": 0.007555593493640433,
            "samples": 799,
            "hits": 733,
            "lineRate": 0.9159097405205051
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
            "patternSamples": 479,
            "patternHits": 441,
            "predictedRate": 0.9204773443094391
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 479,
            "patternHits": 441,
            "predictedRate": 0.9204773443094391
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1331/1453），第1/2/3期结束 60/27/13%，当前上一期开出状态。综合：一期54.9% / 两期79.2% / 三期91.7%，正向 1→2→3 风险→风险→安全（441/479）；反向 3→2→1 安全→风险→风险（441/479），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1300,
        "misses": 153,
        "rate": 0.8947006194081212,
        "baseline": 0.8924154226853429,
        "edge": 0.002285196722778271,
        "stageShare": {
          "first": 0.6092307692307692,
          "second": 0.27153846153846156,
          "third": 0.11923076923076924
        },
        "stageCounts": {
          "first": 792,
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
            "n": 788,
            "hits": 715
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
          "windows": 298,
          "hits": 263,
          "rate": 0.8825503355704698
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
          "predictions": 298,
          "hits": 263,
          "rate": 0.8825503355704698,
          "baseline": 0.9053735829365406,
          "brier": 0.1162065392548876,
          "baselineBrier": 0.10433208674087523,
          "brierSkill": -0.11381400377339701
        }
      ],
      "current": {
        "target": 1466,
        "tail": 8,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 788,
        "hits": 715,
        "lineRate": 0.894938700415006,
        "predictedRate": 0.9064697571817999,
        "baseline": 0.9064697571817999,
        "edge": 0,
        "lower": 0.8932817761988342,
        "upper": 0.919748593144906,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5568194635330289,
            "baseline": 0.5460750853242321,
            "edge": 0.010744378208796812,
            "samples": 797,
            "hits": 444,
            "lineRate": 0.5460750853242321
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.805131201308034,
            "baseline": 0.7939521718365968,
            "edge": 0.011179029471437119,
            "samples": 792,
            "hits": 638,
            "lineRate": 0.7883267731061773
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9070529381290844,
            "baseline": 0.9064697571817999,
            "edge": 0.0005831809472844895,
            "samples": 788,
            "hits": 715,
            "lineRate": 0.894938700415006
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
            "patternSamples": 732,
            "patternHits": 657,
            "predictedRate": 0.8974717739472077
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 732,
            "patternHits": 657,
            "predictedRate": 0.8974717739472077
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 89.5%（1300/1453），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期55.7% / 两期80.5% / 三期90.7%，正向 1→2→3 安全→安全→安全（657/732）；反向 3→2→1 安全→安全→安全（657/732），最终判定：双向全安全·高分。"
      }
    },
    {
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1319,
        "misses": 134,
        "rate": 0.9077770130763937,
        "baseline": 0.9060354648077973,
        "edge": 0.0017415482685964045,
        "stageShare": {
          "first": 0.621683093252464,
          "second": 0.2630780894617134,
          "third": 0.1152388172858226
        },
        "stageCounts": {
          "first": 820,
          "second": 347,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 346,
            "hits": 315
          },
          "after_two_misses": {
            "n": 153,
            "hits": 138
          },
          "after_hit": {
            "n": 817,
            "hits": 735
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
          "windows": 298,
          "hits": 270,
          "rate": 0.9060402684563759
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
          "predictions": 298,
          "hits": 270,
          "rate": 0.9060402684563759,
          "baseline": 0.9136213704483799,
          "brier": 0.09407180798641275,
          "baselineBrier": 0.08518903349060547,
          "brierSkill": -0.10427133789218135
        }
      ],
      "current": {
        "target": 1466,
        "tail": 9,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 817,
        "hits": 735,
        "lineRate": 0.907971797854919,
        "predictedRate": 0.92869156490651,
        "baseline": 0.9174058739614921,
        "edge": 0.011285690945017857,
        "lower": 0.8853663326481952,
        "upper": 0.9122996453953464,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5756703468435095,
            "baseline": 0.5645051194539249,
            "edge": 0.011165227389584587,
            "samples": 823,
            "hits": 474,
            "lineRate": 0.5645051194539249
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8143674298229964,
            "baseline": 0.8103442090181598,
            "edge": 0.004023220804836525,
            "samples": 820,
            "hits": 668,
            "lineRate": 0.803432052565846
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.8998320620753864,
            "baseline": 0.9174058739614921,
            "edge": -0.01757381188610574,
            "samples": 817,
            "hits": 735,
            "lineRate": 0.907971797854919
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
            "patternSamples": 118,
            "patternHits": 110,
            "predictedRate": 0.92869156490651
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 118,
            "patternHits": 110,
            "predictedRate": 0.92869156490651
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.8%（1319/1453），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.6% / 两期81.4% / 三期90.0%，正向 1→2→3 安全→安全→风险（110/118）；反向 3→2→1 风险→安全→安全（110/118），最终判定：双方向混合·观察。"
      }
    },
    {
      "id": "prob1",
      "label": "A",
      "kind": "probability",
      "longTerm": {
        "windows": 1453,
        "hits": 1333,
        "misses": 120,
        "rate": 0.9174122505161735,
        "baseline": 0.9063207291320757,
        "edge": 0.011091521384097747,
        "stageShare": {
          "first": 0.6196549137284321,
          "second": 0.2603150787696924,
          "third": 0.12003000750187547
        },
        "stageCounts": {
          "first": 826,
          "second": 347,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1283,
            "hits": 1178
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
          "windows": 298,
          "hits": 270,
          "rate": 0.9060402684563759
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
          "predictions": 298,
          "hits": 270,
          "rate": 0.9060402684563759,
          "baseline": 0.9073241958815101,
          "brier": 0.09462824364737968,
          "baselineBrier": 0.08610704151326282,
          "brierSkill": -0.09896057261245428
        }
      ],
      "current": {
        "target": 1466,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1283,
        "hits": 1178,
        "lineRate": 0.9173078916031685,
        "predictedRate": 0.9226398666104925,
        "baseline": 0.912253441583299,
        "edge": 0.010386425027193447,
        "lower": 0.9078232400304519,
        "upper": 0.9274312564877901,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5779047249530859,
            "baseline": 0.5556313993174061,
            "edge": 0.02227332563567974,
            "samples": 1294,
            "hits": 748,
            "lineRate": 0.5683404294177405
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.81127376599037,
            "baseline": 0.8025365467273935,
            "edge": 0.008737219262976548,
            "samples": 1288,
            "hits": 1045,
            "lineRate": 0.807304295770196
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9181474733937556,
            "baseline": 0.912253441583299,
            "edge": 0.005894031810456557,
            "samples": 1283,
            "hits": 1178,
            "lineRate": 0.9173078916031685
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
            "patternSamples": 596,
            "patternHits": 550,
            "predictedRate": 0.9226398666104925
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 596,
            "patternHits": 550,
            "predictedRate": 0.9226398666104925
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 91.7%（1333/1453），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.8% / 两期81.1% / 三期91.8%，正向 1→2→3 安全→安全→安全（550/596）；反向 3→2→1 安全→安全→安全（550/596），最终判定：双向全安全·高分。"
      }
    },
    {
      "id": "prob2",
      "label": "B",
      "kind": "probability",
      "longTerm": {
        "windows": 1453,
        "hits": 1314,
        "misses": 139,
        "rate": 0.9043358568479009,
        "baseline": 0.9080606995736425,
        "edge": -0.003724842725741695,
        "stageShare": {
          "first": 0.619482496194825,
          "second": 0.2480974124809741,
          "third": 0.1324200913242009
        },
        "stageCounts": {
          "first": 814,
          "second": 326,
          "third": 174
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1185,
            "hits": 1071
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
          "windows": 298,
          "hits": 262,
          "rate": 0.8791946308724832
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
          "predictions": 298,
          "hits": 262,
          "rate": 0.8791946308724832,
          "baseline": 0.908498318341328,
          "brier": 0.14575665284029807,
          "baselineBrier": 0.10649737431540901,
          "brierSkill": -0.368640811825242
        }
      ],
      "current": {
        "target": 1466,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1185,
        "hits": 1071,
        "lineRate": 0.9047672053706293,
        "predictedRate": 0.652271819174871,
        "baseline": 0.9256588521547695,
        "edge": -0.2733870329798985,
        "lower": 0.8922690715728672,
        "upper": 0.914210813116521,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5595730064519687,
            "baseline": 0.5795221843003413,
            "edge": -0.01994917784837258,
            "samples": 1192,
            "hits": 667,
            "lineRate": 0.5601241909893045
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7855344592319984,
            "baseline": 0.8231984065044439,
            "edge": -0.037663947272445486,
            "samples": 1189,
            "hits": 934,
            "lineRate": 0.7855580605743003
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9038135635746162,
            "baseline": 0.9256588521547695,
            "edge": -0.021845288580153333,
            "samples": 1185,
            "hits": 1071,
            "lineRate": 0.9047672053706293
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
            "patternSamples": 468,
            "patternHits": 424,
            "predictedRate": 0.9059330821873208
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 468,
            "patternHits": 424,
            "predictedRate": 0.9059330821873208
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 90.4%（1314/1453），第1/2/3期结束 62/25/13%，当前上一期开出状态。综合：一期56.0% / 两期78.6% / 三期90.4%，正向 1→2→3 风险→风险→风险（424/468）；反向 3→2→1 风险→风险→风险（424/468），最终判定：双向全风险·低分。"
      }
    },
    {
      "id": "prob3",
      "label": "C",
      "kind": "probability",
      "longTerm": {
        "windows": 1453,
        "hits": 1336,
        "misses": 117,
        "rate": 0.9194769442532691,
        "baseline": 0.9055404977472231,
        "edge": 0.013936446506045974,
        "stageShare": {
          "first": 0.6002994011976048,
          "second": 0.27619760479041916,
          "third": 0.12350299401197605
        },
        "stageCounts": {
          "first": 802,
          "second": 369,
          "third": 165
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1129,
            "hits": 1032
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
          "windows": 298,
          "hits": 274,
          "rate": 0.9194630872483222
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
          "predictions": 298,
          "hits": 274,
          "rate": 0.9194630872483222,
          "baseline": 0.9046854178406324,
          "brier": 0.12469658059249032,
          "baselineBrier": 0.07512647155762878,
          "brierSkill": -0.6598221373519026
        }
      ],
      "current": {
        "target": 1466,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 281,
        "hits": 263,
        "lineRate": 0.9192978968626436,
        "predictedRate": 0.9296378503963071,
        "baseline": 0.9106260349100137,
        "edge": 0.019011815486293382,
        "lower": 0.9146030675350987,
        "upper": 0.9522288986803908,
        "confidence": "高于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5415432185120601,
            "baseline": 0.552901023890785,
            "edge": -0.011357805378724883,
            "samples": 281,
            "hits": 152,
            "lineRate": 0.5502254386065041
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8076125507393918,
            "baseline": 0.8001025055620916,
            "edge": 0.00751004517730014,
            "samples": 281,
            "hits": 227,
            "lineRate": 0.804568888627846
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9348370695589797,
            "baseline": 0.9106260349100137,
            "edge": 0.024211034648966012,
            "samples": 281,
            "hits": 263,
            "lineRate": 0.9192978968626436
          }
        },
        "riskLevels": [
          "risk",
          "safe",
          "safe"
        ],
        "riskPattern": "risk-safe-safe|safe-safe-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 74,
            "patternHits": 69,
            "predictedRate": 0.9296378503963071
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "risk"
            ],
            "riskPattern": "safe-safe-risk",
            "patternSamples": 74,
            "patternHits": 69,
            "predictedRate": 0.9296378503963071
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.9%（1336/1453），第1/2/3期结束 60/28/12%，当前连续遗漏1期状态。综合：一期54.2% / 两期80.8% / 三期93.5%，正向 1→2→3 风险→安全→安全（69/74）；反向 3→2→1 安全→安全→风险（69/74），最终判定：双方向混合·观察。"
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
        "windows": 1453,
        "hits": 1348,
        "misses": 105,
        "rate": 0.9277357192016518,
        "baseline": 0.9169225970229169,
        "edge": 0.010813122178734869,
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
            "n": 817,
            "hits": 755
          },
          "after_one_miss": {
            "n": 359,
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
          "windows": 298,
          "hits": 282,
          "rate": 0.9463087248322147
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
          "predictions": 298,
          "hits": 282,
          "rate": 0.9463087248322147,
          "baseline": 0.9137172957644698,
          "brier": 0.09832411024214739,
          "baselineBrier": 0.05197463434995248,
          "brierSkill": -0.8917710816418141
        }
      ],
      "current": {
        "target": 1466,
        "tail": 6,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 168,
        "hits": 158,
        "lineRate": 0.9275109916899376,
        "predictedRate": 0.9450011570199933,
        "baseline": 0.9166266892059107,
        "edge": 0.028374467814082593,
        "lower": 0.9125836550230668,
        "upper": 0.9598603199260012,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.6204380880148798,
            "baseline": 0.5631399317406144,
            "edge": 0.05729815627426538,
            "samples": 169,
            "hits": 106,
            "lineRate": 0.5631399317406143
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8582852451254749,
            "baseline": 0.8091532807604049,
            "edge": 0.04913196436506995,
            "samples": 169,
            "hits": 146,
            "lineRate": 0.8107955664357369
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9390969140095677,
            "baseline": 0.9166266892059107,
            "edge": 0.022470224803657013,
            "samples": 168,
            "hits": 158,
            "lineRate": 0.9275109916899376
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
            "patternSamples": 170,
            "patternHits": 161,
            "predictedRate": 0.9450011570199933
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 170,
            "patternHits": 161,
            "predictedRate": 0.9450011570199933
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 92.8%（1348/1453），第1/2/3期结束 61/27/12%，当前连续遗漏2期状态。综合：一期62.0% / 两期85.8% / 三期93.9%，正向 1→2→3 安全→安全→安全（161/170）；反向 3→2→1 安全→安全→安全（161/170），最终判定：双向全安全·高分。"
      }
    },
    {
      "rank": 2,
      "id": "prob3",
      "label": "C",
      "kind": "probability",
      "longTerm": {
        "windows": 1453,
        "hits": 1336,
        "misses": 117,
        "rate": 0.9194769442532691,
        "baseline": 0.9055404977472231,
        "edge": 0.013936446506045974,
        "stageShare": {
          "first": 0.6002994011976048,
          "second": 0.27619760479041916,
          "third": 0.12350299401197605
        },
        "stageCounts": {
          "first": 802,
          "second": 369,
          "third": 165
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1129,
            "hits": 1032
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
          "windows": 298,
          "hits": 274,
          "rate": 0.9194630872483222
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
          "predictions": 298,
          "hits": 274,
          "rate": 0.9194630872483222,
          "baseline": 0.9046854178406324,
          "brier": 0.12469658059249032,
          "baselineBrier": 0.07512647155762878,
          "brierSkill": -0.6598221373519026
        }
      ],
      "current": {
        "target": 1466,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 281,
        "hits": 263,
        "lineRate": 0.9192978968626436,
        "predictedRate": 0.9296378503963071,
        "baseline": 0.9106260349100137,
        "edge": 0.019011815486293382,
        "lower": 0.9146030675350987,
        "upper": 0.9522288986803908,
        "confidence": "高于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5415432185120601,
            "baseline": 0.552901023890785,
            "edge": -0.011357805378724883,
            "samples": 281,
            "hits": 152,
            "lineRate": 0.5502254386065041
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8076125507393918,
            "baseline": 0.8001025055620916,
            "edge": 0.00751004517730014,
            "samples": 281,
            "hits": 227,
            "lineRate": 0.804568888627846
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9348370695589797,
            "baseline": 0.9106260349100137,
            "edge": 0.024211034648966012,
            "samples": 281,
            "hits": 263,
            "lineRate": 0.9192978968626436
          }
        },
        "riskLevels": [
          "risk",
          "safe",
          "safe"
        ],
        "riskPattern": "risk-safe-safe|safe-safe-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 74,
            "patternHits": 69,
            "predictedRate": 0.9296378503963071
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "risk"
            ],
            "riskPattern": "safe-safe-risk",
            "patternSamples": 74,
            "patternHits": 69,
            "predictedRate": 0.9296378503963071
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.9%（1336/1453），第1/2/3期结束 60/28/12%，当前连续遗漏1期状态。综合：一期54.2% / 两期80.8% / 三期93.5%，正向 1→2→3 风险→安全→安全（69/74）；反向 3→2→1 安全→安全→风险（69/74），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 3,
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1319,
        "misses": 134,
        "rate": 0.9077770130763937,
        "baseline": 0.9060354648077973,
        "edge": 0.0017415482685964045,
        "stageShare": {
          "first": 0.621683093252464,
          "second": 0.2630780894617134,
          "third": 0.1152388172858226
        },
        "stageCounts": {
          "first": 820,
          "second": 347,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 346,
            "hits": 315
          },
          "after_two_misses": {
            "n": 153,
            "hits": 138
          },
          "after_hit": {
            "n": 817,
            "hits": 735
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
          "windows": 298,
          "hits": 270,
          "rate": 0.9060402684563759
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
          "predictions": 298,
          "hits": 270,
          "rate": 0.9060402684563759,
          "baseline": 0.9136213704483799,
          "brier": 0.09407180798641275,
          "baselineBrier": 0.08518903349060547,
          "brierSkill": -0.10427133789218135
        }
      ],
      "current": {
        "target": 1466,
        "tail": 9,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 817,
        "hits": 735,
        "lineRate": 0.907971797854919,
        "predictedRate": 0.92869156490651,
        "baseline": 0.9174058739614921,
        "edge": 0.011285690945017857,
        "lower": 0.8853663326481952,
        "upper": 0.9122996453953464,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5756703468435095,
            "baseline": 0.5645051194539249,
            "edge": 0.011165227389584587,
            "samples": 823,
            "hits": 474,
            "lineRate": 0.5645051194539249
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8143674298229964,
            "baseline": 0.8103442090181598,
            "edge": 0.004023220804836525,
            "samples": 820,
            "hits": 668,
            "lineRate": 0.803432052565846
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.8998320620753864,
            "baseline": 0.9174058739614921,
            "edge": -0.01757381188610574,
            "samples": 817,
            "hits": 735,
            "lineRate": 0.907971797854919
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
            "patternSamples": 118,
            "patternHits": 110,
            "predictedRate": 0.92869156490651
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 118,
            "patternHits": 110,
            "predictedRate": 0.92869156490651
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.8%（1319/1453），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.6% / 两期81.4% / 三期90.0%，正向 1→2→3 安全→安全→风险（110/118）；反向 3→2→1 风险→安全→安全（110/118），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 4,
      "id": "prob1",
      "label": "A",
      "kind": "probability",
      "longTerm": {
        "windows": 1453,
        "hits": 1333,
        "misses": 120,
        "rate": 0.9174122505161735,
        "baseline": 0.9063207291320757,
        "edge": 0.011091521384097747,
        "stageShare": {
          "first": 0.6196549137284321,
          "second": 0.2603150787696924,
          "third": 0.12003000750187547
        },
        "stageCounts": {
          "first": 826,
          "second": 347,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1283,
            "hits": 1178
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
          "windows": 298,
          "hits": 270,
          "rate": 0.9060402684563759
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
          "predictions": 298,
          "hits": 270,
          "rate": 0.9060402684563759,
          "baseline": 0.9073241958815101,
          "brier": 0.09462824364737968,
          "baselineBrier": 0.08610704151326282,
          "brierSkill": -0.09896057261245428
        }
      ],
      "current": {
        "target": 1466,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1283,
        "hits": 1178,
        "lineRate": 0.9173078916031685,
        "predictedRate": 0.9226398666104925,
        "baseline": 0.912253441583299,
        "edge": 0.010386425027193447,
        "lower": 0.9078232400304519,
        "upper": 0.9274312564877901,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5779047249530859,
            "baseline": 0.5556313993174061,
            "edge": 0.02227332563567974,
            "samples": 1294,
            "hits": 748,
            "lineRate": 0.5683404294177405
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.81127376599037,
            "baseline": 0.8025365467273935,
            "edge": 0.008737219262976548,
            "samples": 1288,
            "hits": 1045,
            "lineRate": 0.807304295770196
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9181474733937556,
            "baseline": 0.912253441583299,
            "edge": 0.005894031810456557,
            "samples": 1283,
            "hits": 1178,
            "lineRate": 0.9173078916031685
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
            "patternSamples": 596,
            "patternHits": 550,
            "predictedRate": 0.9226398666104925
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 596,
            "patternHits": 550,
            "predictedRate": 0.9226398666104925
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 91.7%（1333/1453），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.8% / 两期81.1% / 三期91.8%，正向 1→2→3 安全→安全→安全（550/596）；反向 3→2→1 安全→安全→安全（550/596），最终判定：双向全安全·高分。"
      }
    },
    {
      "rank": 5,
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1331,
        "misses": 122,
        "rate": 0.9160357880247764,
        "baseline": 0.9139522070271211,
        "edge": 0.0020835809976552655,
        "stageShare": {
          "first": 0.6025544703230654,
          "second": 0.270473328324568,
          "third": 0.12697220135236664
        },
        "stageCounts": {
          "first": 802,
          "second": 360,
          "third": 169
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 799,
            "hits": 733
          },
          "after_one_miss": {
            "n": 361,
            "hits": 329
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
          "windows": 298,
          "hits": 281,
          "rate": 0.9429530201342282
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
          "predictions": 298,
          "hits": 281,
          "rate": 0.9429530201342282,
          "baseline": 0.9091190709379069,
          "brier": 0.05564877580824333,
          "baselineBrier": 0.055005143961083997,
          "brierSkill": -0.011701302838416305
        }
      ],
      "current": {
        "target": 1466,
        "tail": 7,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 799,
        "hits": 733,
        "lineRate": 0.9159097405205051,
        "predictedRate": 0.9204773443094391,
        "baseline": 0.9098048397303035,
        "edge": 0.0106725045791356,
        "lower": 0.9040604850376484,
        "upper": 0.9290247129743379,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5485809668975115,
            "baseline": 0.5515358361774744,
            "edge": -0.002954869279962913,
            "samples": 804,
            "hits": 441,
            "lineRate": 0.5515358361774744
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7919833261731696,
            "baseline": 0.7988798937669629,
            "edge": -0.006896567593793312,
            "samples": 802,
            "hits": 635,
            "lineRate": 0.8005147057172659
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9173604332239439,
            "baseline": 0.9098048397303035,
            "edge": 0.007555593493640433,
            "samples": 799,
            "hits": 733,
            "lineRate": 0.9159097405205051
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
            "patternSamples": 479,
            "patternHits": 441,
            "predictedRate": 0.9204773443094391
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 479,
            "patternHits": 441,
            "predictedRate": 0.9204773443094391
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1331/1453），第1/2/3期结束 60/27/13%，当前上一期开出状态。综合：一期54.9% / 两期79.2% / 三期91.7%，正向 1→2→3 风险→风险→安全（441/479）；反向 3→2→1 安全→风险→风险（441/479），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 6,
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1331,
        "misses": 122,
        "rate": 0.9160357880247764,
        "baseline": 0.9383526659505848,
        "edge": -0.022316877925808387,
        "stageShare": {
          "first": 0.6311044327573253,
          "second": 0.25469571750563486,
          "third": 0.11419984973703982
        },
        "stageCounts": {
          "first": 840,
          "second": 339,
          "third": 152
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 837,
            "hits": 767
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
            "n": 121,
            "hits": 112
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
          "windows": 298,
          "hits": 259,
          "rate": 0.8691275167785235
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
          "predictions": 298,
          "hits": 259,
          "rate": 0.8691275167785235,
          "baseline": 0.9285420313171666,
          "brier": 0.13253083132855073,
          "baselineBrier": 0.11739097670292203,
          "brierSkill": -0.12896949195629137
        }
      ],
      "current": {
        "target": 1466,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 837,
        "hits": 767,
        "lineRate": 0.9162304555392065,
        "predictedRate": 0.91722320478961,
        "baseline": 0.9256588521547695,
        "edge": -0.00843564736515956,
        "lower": 0.9032914153148595,
        "upper": 0.9278176777102154,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5960583164000078,
            "baseline": 0.5795221843003413,
            "edge": 0.016536132099666534,
            "samples": 845,
            "hits": 504,
            "lineRate": 0.5795221843003413
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8188935285456936,
            "baseline": 0.8231984065044439,
            "edge": -0.004304877958750231,
            "samples": 840,
            "hits": 688,
            "lineRate": 0.8124217274648309
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9163647714244855,
            "baseline": 0.9256588521547695,
            "edge": -0.009294080730284038,
            "samples": 837,
            "hits": 767,
            "lineRate": 0.9162304555392065
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
            "patternSamples": 713,
            "patternHits": 654,
            "predictedRate": 0.91722320478961
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "safe"
            ],
            "riskPattern": "risk-risk-safe",
            "patternSamples": 713,
            "patternHits": 654,
            "predictedRate": 0.91722320478961
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.6%（1331/1453），第1/2/3期结束 63/25/11%，当前上一期开出状态。综合：一期59.6% / 两期81.9% / 三期91.6%，正向 1→2→3 安全→风险→风险（654/713）；反向 3→2→1 风险→风险→安全（654/713），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 7,
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1324,
        "misses": 129,
        "rate": 0.9112181693048864,
        "baseline": 0.9115528075575987,
        "edge": -0.00033463825271229375,
        "stageShare": {
          "first": 0.6057401812688822,
          "second": 0.2681268882175227,
          "third": 0.12613293051359517
        },
        "stageCounts": {
          "first": 802,
          "second": 355,
          "third": 167
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 798,
            "hits": 728
          },
          "after_one_miss": {
            "n": 353,
            "hits": 324
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
          "windows": 298,
          "hits": 264,
          "rate": 0.8859060402684564
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
          "predictions": 298,
          "hits": 264,
          "rate": 0.8859060402684564,
          "baseline": 0.913295011448986,
          "brier": 0.11071491390132314,
          "baselineBrier": 0.10180134961399862,
          "brierSkill": -0.08755840979635532
        }
      ],
      "current": {
        "target": 1466,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 353,
        "hits": 324,
        "lineRate": 0.911206190861295,
        "predictedRate": 0.9153915484584496,
        "baseline": 0.9106260349100137,
        "edge": 0.004765513548435907,
        "lower": 0.8971526491068075,
        "upper": 0.9346805646681248,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5333103991453997,
            "baseline": 0.552901023890785,
            "edge": -0.01959062474538531,
            "samples": 357,
            "hits": 190,
            "lineRate": 0.552901023890785
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8025163402790907,
            "baseline": 0.8001025055620916,
            "edge": 0.002413834716999075,
            "samples": 355,
            "hits": 285,
            "lineRate": 0.7971813802329502
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9174909485716513,
            "baseline": 0.9106260349100137,
            "edge": 0.006864913661637551,
            "samples": 353,
            "hits": 324,
            "lineRate": 0.911206190861295
          }
        },
        "riskLevels": [
          "risk",
          "safe",
          "safe"
        ],
        "riskPattern": "risk-safe-safe|safe-safe-risk",
        "directionPredictions": {
          "forward": {
            "riskLevels": [
              "risk",
              "safe",
              "safe"
            ],
            "riskPattern": "risk-safe-safe",
            "patternSamples": 131,
            "patternHits": 120,
            "predictedRate": 0.9153915484584496
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "risk"
            ],
            "riskPattern": "safe-safe-risk",
            "patternSamples": 131,
            "patternHits": 120,
            "predictedRate": 0.9153915484584496
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1324/1453），第1/2/3期结束 61/27/13%，当前连续遗漏1期状态。综合：一期53.3% / 两期80.3% / 三期91.7%，正向 1→2→3 风险→安全→安全（120/131）；反向 3→2→1 安全→安全→风险（120/131），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 8,
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1300,
        "misses": 153,
        "rate": 0.8947006194081212,
        "baseline": 0.8924154226853429,
        "edge": 0.002285196722778271,
        "stageShare": {
          "first": 0.6092307692307692,
          "second": 0.27153846153846156,
          "third": 0.11923076923076924
        },
        "stageCounts": {
          "first": 792,
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
            "n": 788,
            "hits": 715
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
          "windows": 298,
          "hits": 263,
          "rate": 0.8825503355704698
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
          "predictions": 298,
          "hits": 263,
          "rate": 0.8825503355704698,
          "baseline": 0.9053735829365406,
          "brier": 0.1162065392548876,
          "baselineBrier": 0.10433208674087523,
          "brierSkill": -0.11381400377339701
        }
      ],
      "current": {
        "target": 1466,
        "tail": 8,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 788,
        "hits": 715,
        "lineRate": 0.894938700415006,
        "predictedRate": 0.9064697571817999,
        "baseline": 0.9064697571817999,
        "edge": 0,
        "lower": 0.8932817761988342,
        "upper": 0.919748593144906,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5568194635330289,
            "baseline": 0.5460750853242321,
            "edge": 0.010744378208796812,
            "samples": 797,
            "hits": 444,
            "lineRate": 0.5460750853242321
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.805131201308034,
            "baseline": 0.7939521718365968,
            "edge": 0.011179029471437119,
            "samples": 792,
            "hits": 638,
            "lineRate": 0.7883267731061773
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9070529381290844,
            "baseline": 0.9064697571817999,
            "edge": 0.0005831809472844895,
            "samples": 788,
            "hits": 715,
            "lineRate": 0.894938700415006
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
            "patternSamples": 732,
            "patternHits": 657,
            "predictedRate": 0.8974717739472077
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "safe",
              "safe"
            ],
            "riskPattern": "safe-safe-safe",
            "patternSamples": 732,
            "patternHits": 657,
            "predictedRate": 0.8974717739472077
          }
        },
        "cascadeDecision": "双向全安全·高分",
        "reason": "长期新三期窗口 89.5%（1300/1453），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期55.7% / 两期80.5% / 三期90.7%，正向 1→2→3 安全→安全→安全（657/732）；反向 3→2→1 安全→安全→安全（657/732），最终判定：双向全安全·高分。"
      }
    },
    {
      "rank": 9,
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1318,
        "misses": 135,
        "rate": 0.9070887818306951,
        "baseline": 0.9146335401132302,
        "edge": -0.007544758282535091,
        "stageShare": {
          "first": 0.6107738998482549,
          "second": 0.26934749620637327,
          "third": 0.11987860394537178
        },
        "stageCounts": {
          "first": 805,
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
            "n": 802,
            "hits": 737
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
          "windows": 298,
          "hits": 254,
          "rate": 0.8523489932885906
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
          "predictions": 298,
          "hits": 254,
          "rate": 0.8523489932885906,
          "baseline": 0.9157634412158275,
          "brier": 0.13295974354370987,
          "baselineBrier": 0.12986216885593066,
          "brierSkill": -0.023852787267211406
        }
      ],
      "current": {
        "target": 1466,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 802,
        "hits": 737,
        "lineRate": 0.9071932591014827,
        "predictedRate": 0.8977023560130946,
        "baseline": 0.912253441583299,
        "edge": -0.014551085570204458,
        "lower": 0.905746510626965,
        "upper": 0.9304504655254936,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5627862987787327,
            "baseline": 0.5556313993174061,
            "edge": 0.007154899461326525,
            "samples": 810,
            "hits": 456,
            "lineRate": 0.5556313993174061
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8023896631280188,
            "baseline": 0.8025365467273935,
            "edge": -0.00014688359937464757,
            "samples": 805,
            "hits": 646,
            "lineRate": 0.7985736040307736
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9186665026545373,
            "baseline": 0.912253441583299,
            "edge": 0.006413061071238291,
            "samples": 802,
            "hits": 737,
            "lineRate": 0.9071932591014827
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
            "predictedRate": 0.8977023560130946
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
            "predictedRate": 0.8977023560130946
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.7%（1318/1453），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.3% / 两期80.2% / 三期91.9%，正向 1→2→3 安全→风险→安全（121/135）；反向 3→2→1 安全→风险→安全（121/135），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 10,
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1311,
        "misses": 142,
        "rate": 0.9022711631108052,
        "baseline": 0.9051988544562679,
        "edge": -0.0029276913454626685,
        "stageShare": {
          "first": 0.5888634630053394,
          "second": 0.2753623188405797,
          "third": 0.13577421815408086
        },
        "stageCounts": {
          "first": 772,
          "second": 361,
          "third": 178
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 769,
            "hits": 697
          },
          "after_one_miss": {
            "n": 361,
            "hits": 322
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
          "windows": 298,
          "hits": 276,
          "rate": 0.9261744966442953
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
          "predictions": 298,
          "hits": 276,
          "rate": 0.9261744966442953,
          "baseline": 0.8966053936998626,
          "brier": 0.07688862819636831,
          "baselineBrier": 0.06932450318093512,
          "brierSkill": -0.1091118532171953
        }
      ],
      "current": {
        "target": 1466,
        "tail": 4,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 176,
        "hits": 160,
        "lineRate": 0.902171130919665,
        "predictedRate": 0.8958370694008368,
        "baseline": 0.8973262384621112,
        "edge": -0.0014891690612743869,
        "lower": 0.8774522513337522,
        "upper": 0.9331832869282453,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5890647085186335,
            "baseline": 0.531740614334471,
            "edge": 0.05732409418416251,
            "samples": 178,
            "hits": 106,
            "lineRate": 0.531740614334471
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7796955674562415,
            "baseline": 0.7807331477361413,
            "edge": -0.0010375802798998635,
            "samples": 177,
            "hits": 138,
            "lineRate": 0.7800013394439786
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9083848092775169,
            "baseline": 0.8973262384621112,
            "edge": 0.011058570815405622,
            "samples": 176,
            "hits": 160,
            "lineRate": 0.902171130919665
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
            "patternSamples": 450,
            "patternHits": 403,
            "predictedRate": 0.8958370694008368
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "safe"
            ],
            "riskPattern": "safe-risk-safe",
            "patternSamples": 450,
            "patternHits": 403,
            "predictedRate": 0.8958370694008368
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 90.2%（1311/1453），第1/2/3期结束 59/28/14%，当前连续遗漏2期状态。综合：一期58.9% / 两期78.0% / 三期90.8%，正向 1→2→3 安全→风险→安全（403/450）；反向 3→2→1 安全→风险→安全（403/450），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 11,
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1324,
        "misses": 129,
        "rate": 0.9112181693048864,
        "baseline": 0.9096237920407555,
        "edge": 0.0015943772641309195,
        "stageShare": {
          "first": 0.6042296072507553,
          "second": 0.27492447129909364,
          "third": 0.12084592145015106
        },
        "stageCounts": {
          "first": 800,
          "second": 364,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 364,
            "hits": 330
          },
          "after_hit": {
            "n": 796,
            "hits": 733
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
          "windows": 298,
          "hits": 278,
          "rate": 0.9328859060402684
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
          "predictions": 298,
          "hits": 278,
          "rate": 0.9328859060402684,
          "baseline": 0.9100671720629475,
          "brier": 0.07117936402008855,
          "baselineBrier": 0.06315383195658732,
          "brierSkill": -0.12707909900096137
        }
      ],
      "current": {
        "target": 1466,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 796,
        "hits": 733,
        "lineRate": 0.9111812345752008,
        "predictedRate": 0.8386577307500955,
        "baseline": 0.9093923625007588,
        "edge": -0.0707346317506633,
        "lower": 0.9077239669414734,
        "upper": 0.9322556528962875,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5462494706160783,
            "baseline": 0.5508532423208191,
            "edge": -0.0046037717047408,
            "samples": 802,
            "hits": 438,
            "lineRate": 0.5508532423208191
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.80002863299484,
            "baseline": 0.7982671900662792,
            "edge": 0.0017614429285607303,
            "samples": 800,
            "hits": 640,
            "lineRate": 0.8011739527884408
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9206171871219412,
            "baseline": 0.9093923625007588,
            "edge": 0.01122482462118235,
            "samples": 796,
            "hits": 733,
            "lineRate": 0.9111812345752008
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
            "patternSamples": 22,
            "patternHits": 17,
            "predictedRate": 0.8386577307500955
          },
          "reverse": {
            "riskLevels": [
              "safe",
              "risk",
              "risk"
            ],
            "riskPattern": "safe-risk-risk",
            "patternSamples": 22,
            "patternHits": 17,
            "predictedRate": 0.8386577307500955
          }
        },
        "cascadeDecision": "双方向混合·观察",
        "reason": "长期新三期窗口 91.1%（1324/1453），第1/2/3期结束 60/27/12%，当前上一期开出状态。综合：一期54.6% / 两期80.0% / 三期92.1%，正向 1→2→3 风险→风险→安全（17/22）；反向 3→2→1 安全→风险→风险（17/22），最终判定：双方向混合·观察。"
      }
    },
    {
      "rank": 12,
      "id": "prob2",
      "label": "B",
      "kind": "probability",
      "longTerm": {
        "windows": 1453,
        "hits": 1314,
        "misses": 139,
        "rate": 0.9043358568479009,
        "baseline": 0.9080606995736425,
        "edge": -0.003724842725741695,
        "stageShare": {
          "first": 0.619482496194825,
          "second": 0.2480974124809741,
          "third": 0.1324200913242009
        },
        "stageCounts": {
          "first": 814,
          "second": 326,
          "third": 174
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1185,
            "hits": 1071
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
          "windows": 298,
          "hits": 262,
          "rate": 0.8791946308724832
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
          "predictions": 298,
          "hits": 262,
          "rate": 0.8791946308724832,
          "baseline": 0.908498318341328,
          "brier": 0.14575665284029807,
          "baselineBrier": 0.10649737431540901,
          "brierSkill": -0.368640811825242
        }
      ],
      "current": {
        "target": 1466,
        "tail": 2,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1185,
        "hits": 1071,
        "lineRate": 0.9047672053706293,
        "predictedRate": 0.652271819174871,
        "baseline": 0.9256588521547695,
        "edge": -0.2733870329798985,
        "lower": 0.8922690715728672,
        "upper": 0.914210813116521,
        "confidence": "低于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5595730064519687,
            "baseline": 0.5795221843003413,
            "edge": -0.01994917784837258,
            "samples": 1192,
            "hits": 667,
            "lineRate": 0.5601241909893045
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7855344592319984,
            "baseline": 0.8231984065044439,
            "edge": -0.037663947272445486,
            "samples": 1189,
            "hits": 934,
            "lineRate": 0.7855580605743003
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9038135635746162,
            "baseline": 0.9256588521547695,
            "edge": -0.021845288580153333,
            "samples": 1185,
            "hits": 1071,
            "lineRate": 0.9047672053706293
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
            "patternSamples": 468,
            "patternHits": 424,
            "predictedRate": 0.9059330821873208
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 468,
            "patternHits": 424,
            "predictedRate": 0.9059330821873208
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 90.4%（1314/1453），第1/2/3期结束 62/25/13%，当前上一期开出状态。综合：一期56.0% / 两期78.6% / 三期90.4%，正向 1→2→3 风险→风险→风险（424/468）；反向 3→2→1 风险→风险→风险（424/468），最终判定：双向全风险·低分。"
      }
    },
    {
      "rank": 13,
      "id": "tail0",
      "label": "尾0",
      "kind": "tail",
      "longTerm": {
        "windows": 1453,
        "hits": 1218,
        "misses": 235,
        "rate": 0.8382656572608397,
        "baseline": 0.8209192292808023,
        "edge": 0.017346427980037382,
        "stageShare": {
          "first": 0.5665024630541872,
          "second": 0.29310344827586204,
          "third": 0.14039408866995073
        },
        "stageCounts": {
          "first": 690,
          "second": 357,
          "third": 171
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 358,
            "hits": 306
          },
          "after_two_misses": {
            "n": 172,
            "hits": 142
          },
          "after_hit": {
            "n": 688,
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
          "windows": 298,
          "hits": 267,
          "rate": 0.8959731543624161
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
          "predictions": 298,
          "hits": 267,
          "rate": 0.8959731543624161,
          "baseline": 0.8516127553441704,
          "brier": 0.10921793153965823,
          "baselineBrier": 0.0954926784887028,
          "brierSkill": -0.14373094637385408
        }
      ],
      "current": {
        "target": 1466,
        "tail": 0,
        "state": "after_two_misses",
        "stateLabel": "连续遗漏2期",
        "samples": 172,
        "hits": 142,
        "lineRate": 0.8386001843347562,
        "predictedRate": 0.5823640734203824,
        "baseline": 0.8548024456147842,
        "edge": -0.2724383721944018,
        "lower": 0.7855208215493663,
        "upper": 0.859497791844906,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.4660836177474403,
            "baseline": 0.4744027303754266,
            "edge": -0.008319112627986291,
            "samples": 172,
            "hits": 80,
            "lineRate": 0.4744027303754266
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7000442428716767,
            "baseline": 0.7237475101631934,
            "edge": -0.023703267291516728,
            "samples": 172,
            "hits": 120,
            "lineRate": 0.7204247315680965
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.826937519201537,
            "baseline": 0.8548024456147842,
            "edge": -0.027864926413247226,
            "samples": 172,
            "hits": 142,
            "lineRate": 0.8386001843347562
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
            "patternSamples": 452,
            "patternHits": 365,
            "predictedRate": 0.8088389908616422
          },
          "reverse": {
            "riskLevels": [
              "risk",
              "risk",
              "risk"
            ],
            "riskPattern": "risk-risk-risk",
            "patternSamples": 452,
            "patternHits": 365,
            "predictedRate": 0.8088389908616422
          }
        },
        "cascadeDecision": "双向全风险·低分",
        "reason": "长期新三期窗口 83.8%（1218/1453），第1/2/3期结束 57/29/14%，当前连续遗漏2期状态。综合：一期46.6% / 两期70.0% / 三期82.7%，正向 1→2→3 风险→风险→风险（365/452）；反向 3→2→1 风险→风险→风险（365/452），最终判定：双向全风险·低分。"
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
      "periods": 298,
      "all": {
        "n": 3874,
        "hits": 3500,
        "rate": 0.9034589571502323
      },
      "top2": {
        "n": 596,
        "hits": 530,
        "rate": 0.889261744966443
      },
      "top3": {
        "n": 894,
        "hits": 796,
        "rate": 0.8903803131991052
      },
      "top2Lift": -0.014197212183789332,
      "top3Lift": -0.013078643951127122
    }
  ]
};
