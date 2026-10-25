window.APP_PERSONALITY_MODEL = {
  "version": "next-window-v2-20261026",
  "method": "per-line-next-window-personality-v2",
  "generatedAt": "2026-10-25T16:47:03.721Z",
  "asOfPeriod": 1463,
  "target": 1464,
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
  "lookAheadUsed": false,
  "overlappingWindows": true,
  "lines": [
    {
      "id": "tail0",
      "label": "尾0",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1216,
        "misses": 235,
        "rate": 0.8380427291523087,
        "baseline": 0.8208724008077456,
        "edge": 0.017170328344563113,
        "stageShare": {
          "first": 0.5657894736842105,
          "second": 0.2935855263157895,
          "third": 0.140625
        },
        "stageCounts": {
          "first": 688,
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
            "n": 171,
            "hits": 141
          },
          "after_hit": {
            "n": 687,
            "hits": 595
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
          "windows": 296,
          "hits": 265,
          "rate": 0.8952702702702703
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.8419641649355917,
          "brier": 0.08464199935975993,
          "baselineBrier": 0.07883755317389056,
          "brierSkill": -0.07362539744310181
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 265,
          "rate": 0.8952702702702703,
          "baseline": 0.8515905895932288,
          "brier": 0.09623333685014983,
          "baselineBrier": 0.09599562915087342,
          "brierSkill": -0.00247623460962787
        }
      ],
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 687,
        "hits": 595,
        "lineRate": 0.8383930977761314,
        "predictedRate": 0.8653010777305837,
        "baseline": 0.8553392602150206,
        "edge": 0.009961817515563132,
        "lower": 0.8485790788760227,
        "upper": 0.8818478040860659,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 83.8%（1216/1451），第1/2/3期结束 57/29/14%，当前上一期开出历史 595/687。"
      }
    },
    {
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1322,
        "misses": 129,
        "rate": 0.9110957960027567,
        "baseline": 0.9096241521538668,
        "edge": 0.0014716438488898698,
        "stageShare": {
          "first": 0.6043872919818457,
          "second": 0.2745839636913767,
          "third": 0.12102874432677761
        },
        "stageCounts": {
          "first": 799,
          "second": 363,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 363,
            "hits": 329
          },
          "after_hit": {
            "n": 795,
            "hits": 732
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
          "windows": 296,
          "hits": 276,
          "rate": 0.9324324324324325
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 209,
          "rate": 0.9047619047619048,
          "baseline": 0.9089090356805571,
          "brier": 0.08620694950223605,
          "baselineBrier": 0.08637437409156325,
          "brierSkill": 0.0019383595086861494
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 276,
          "rate": 0.9324324324324325,
          "baseline": 0.9100719331581135,
          "brier": 0.06400035139790704,
          "baselineBrier": 0.06352503917262321,
          "brierSkill": -0.007482281498358612
        }
      ],
      "current": {
        "target": 1464,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 795,
        "hits": 732,
        "lineRate": 0.9110621423806138,
        "predictedRate": 0.9205168623897083,
        "baseline": 0.9094344288563013,
        "edge": 0.011082433533406988,
        "lower": 0.9076087944063557,
        "upper": 0.932169955902442,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 60/27/12%，当前上一期开出历史 732/795。"
      }
    },
    {
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1329,
        "misses": 122,
        "rate": 0.9159200551343901,
        "baseline": 0.9383701484416478,
        "edge": -0.022450093307257668,
        "stageShare": {
          "first": 0.6320541760722348,
          "second": 0.254326561324304,
          "third": 0.11361926260346125
        },
        "stageCounts": {
          "first": 840,
          "second": 338,
          "third": 151
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
            "n": 337,
            "hits": 305
          },
          "after_two_misses": {
            "n": 150,
            "hits": 139
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
          "windows": 296,
          "hits": 257,
          "rate": 0.8682432432432432
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.9341438982351735,
          "brier": 0.07197799285468132,
          "baselineBrier": 0.07210203565371867,
          "brierSkill": 0.001720378598367045
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 257,
          "rate": 0.8682432432432432,
          "baseline": 0.9285614428890097,
          "brier": 0.1184308159578144,
          "baselineBrier": 0.11814682728216891,
          "brierSkill": -0.002403692779385791
        }
      ],
      "current": {
        "target": 1464,
        "tail": 2,
        "state": "after_three_plus_misses",
        "stateLabel": "连续遗漏3期以上",
        "samples": 121,
        "hits": 112,
        "lineRate": 0.916111145511415,
        "predictedRate": 0.9242710844697043,
        "baseline": 0.9253535500801866,
        "edge": -0.0010824656104823083,
        "lower": 0.8890774382859613,
        "upper": 0.9507900094302516,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 63/25/11%，当前连续遗漏3期以上历史 112/121。"
      }
    },
    {
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1316,
        "misses": 135,
        "rate": 0.906960716747071,
        "baseline": 0.9146376918400867,
        "edge": -0.007676975093015681,
        "stageShare": {
          "first": 0.6101823708206687,
          "second": 0.26975683890577506,
          "third": 0.12006079027355623
        },
        "stageCounts": {
          "first": 803,
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
            "n": 800,
            "hits": 735
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
          "windows": 296,
          "hits": 252,
          "rate": 0.8513513513513513
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 219,
          "rate": 0.948051948051948,
          "baseline": 0.9191288645846455,
          "brier": 0.0506222364104259,
          "baselineBrier": 0.05014791876744616,
          "brierSkill": -0.009458371446666058
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 252,
          "rate": 0.8513513513513513,
          "baseline": 0.9157914275599968,
          "brier": 0.12999433136049396,
          "baselineBrier": 0.13068684044173132,
          "brierSkill": 0.005298996279171075
        }
      ],
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 800,
        "hits": 735,
        "lineRate": 0.9070606297074246,
        "predictedRate": 0.9184648934074982,
        "baseline": 0.9118930865565257,
        "edge": 0.0065718068509724725,
        "lower": 0.9055127144036271,
        "upper": 0.930275591146606,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.7%（1316/1451），第1/2/3期结束 61/27/12%，当前上一期开出历史 735/800。"
      }
    },
    {
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1309,
        "misses": 142,
        "rate": 0.9021364576154376,
        "baseline": 0.9052091722283556,
        "edge": -0.003072714612918026,
        "stageShare": {
          "first": 0.5889992360580596,
          "second": 0.2750190985485103,
          "third": 0.1359816653934301
        },
        "stageCounts": {
          "first": 771,
          "second": 360,
          "third": 178
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 768,
            "hits": 696
          },
          "after_one_miss": {
            "n": 360,
            "hits": 321
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
          "windows": 296,
          "hits": 274,
          "rate": 0.9256756756756757
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 204,
          "rate": 0.8831168831168831,
          "baseline": 0.9002478996307975,
          "brier": 0.10434663135641319,
          "baselineBrier": 0.10359967091892772,
          "brierSkill": -0.007210065735343996
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 274,
          "rate": 0.9256756756756757,
          "baseline": 0.8965979077734645,
          "brier": 0.06968740407970668,
          "baselineBrier": 0.06972221887090527,
          "brierSkill": 0.0004993356746584299
        }
      ],
      "current": {
        "target": 1464,
        "tail": 4,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 768,
        "hits": 696,
        "lineRate": 0.9020486900141818,
        "predictedRate": 0.9061433677668573,
        "baseline": 0.8978036637001049,
        "edge": 0.00833970406675244,
        "lower": 0.8919088259214333,
        "upper": 0.9188615306512117,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.2%（1309/1451），第1/2/3期结束 59/28/14%，当前上一期开出历史 696/768。"
      }
    },
    {
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1322,
        "misses": 129,
        "rate": 0.9110957960027567,
        "baseline": 0.9115538391207002,
        "edge": -0.0004580431179435074,
        "stageShare": {
          "first": 0.6059001512859304,
          "second": 0.26777609682299547,
          "third": 0.12632375189107414
        },
        "stageCounts": {
          "first": 801,
          "second": 354,
          "third": 167
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 796,
            "hits": 726
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
          "windows": 296,
          "hits": 262,
          "rate": 0.8851351351351351
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9160271011339205,
          "brier": 0.09122619665965706,
          "baselineBrier": 0.08990699581094128,
          "brierSkill": -0.01467294993917756
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 262,
          "rate": 0.8851351351351351,
          "baseline": 0.9133118398471041,
          "brier": 0.1029106550038176,
          "baselineBrier": 0.10243544074707525,
          "brierSkill": -0.004639158608354288
        }
      ],
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 353,
        "hits": 324,
        "lineRate": 0.9110871586115468,
        "predictedRate": 0.9174845661453913,
        "baseline": 0.9106693967900266,
        "edge": 0.0068151693553647474,
        "lower": 0.8971526491068075,
        "upper": 0.9346805646681248,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 61/27/13%，当前连续遗漏1期历史 324/353。"
      }
    },
    {
      "id": "tail6",
      "label": "尾6",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1346,
        "misses": 105,
        "rate": 0.9276361130254996,
        "baseline": 0.9169227508380364,
        "edge": 0.010713362187463216,
        "stageShare": {
          "first": 0.6092124814264487,
          "second": 0.2659732540861813,
          "third": 0.12481426448736999
        },
        "stageCounts": {
          "first": 820,
          "second": 358,
          "third": 168
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 815,
            "hits": 753
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
          "windows": 296,
          "hits": 280,
          "rate": 0.9459459459459459
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.914101679464,
          "brier": 0.0909150308972192,
          "baselineBrier": 0.0898989285526357,
          "brierSkill": -0.011302719186342403
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 280,
          "rate": 0.9459459459459459,
          "baseline": 0.9136963923294065,
          "brier": 0.05176311977584207,
          "baselineBrier": 0.05227905474204874,
          "brierSkill": 0.00986886562414635
        }
      ],
      "current": {
        "target": 1464,
        "tail": 6,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 815,
        "hits": 753,
        "lineRate": 0.9274220123996265,
        "predictedRate": 0.9240101080814281,
        "baseline": 0.9170666787949012,
        "edge": 0.006943429286526914,
        "lower": 0.9111705263237647,
        "upper": 0.9349812098669409,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 92.8%（1346/1451），第1/2/3期结束 61/27/12%，当前上一期开出历史 753/815。"
      }
    },
    {
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1329,
        "misses": 122,
        "rate": 0.9159200551343901,
        "baseline": 0.9139582480980566,
        "edge": 0.0019618070363335294,
        "stageShare": {
          "first": 0.6019563581640331,
          "second": 0.2708803611738149,
          "third": 0.127163280662152
        },
        "stageCounts": {
          "first": 800,
          "second": 360,
          "third": 169
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 798,
            "hits": 732
          },
          "after_one_miss": {
            "n": 360,
            "hits": 328
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
          "windows": 296,
          "hits": 279,
          "rate": 0.9425675675675675
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 206,
          "rate": 0.8917748917748918,
          "baseline": 0.9075738715881736,
          "brier": 0.09714222227619354,
          "baselineBrier": 0.09682614881175577,
          "brierSkill": -0.003264339936231986
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 279,
          "rate": 0.9425675675675675,
          "baseline": 0.9091160281059779,
          "brier": 0.0555317326809501,
          "baselineBrier": 0.05532154560804748,
          "brierSkill": -0.003799370942955793
        }
      ],
      "current": {
        "target": 1464,
        "tail": 7,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 798,
        "hits": 732,
        "lineRate": 0.915797042697314,
        "predictedRate": 0.9172566514106922,
        "baseline": 0.9098473411574023,
        "edge": 0.007409310253289947,
        "lower": 0.903941206774862,
        "upper": 0.92893525338513,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 60/27/13%，当前上一期开出历史 732/798。"
      }
    },
    {
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1298,
        "misses": 153,
        "rate": 0.8945554789800138,
        "baseline": 0.8923966865205613,
        "edge": 0.0021587924594524965,
        "stageShare": {
          "first": 0.6093990755007704,
          "second": 0.2711864406779661,
          "third": 0.11941448382126348
        },
        "stageCounts": {
          "first": 791,
          "second": 352,
          "third": 155
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 4
          },
          "after_one_miss": {
            "n": 351,
            "hits": 313
          },
          "after_two_misses": {
            "n": 154,
            "hits": 133
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
          "windows": 296,
          "hits": 261,
          "rate": 0.8817567567567568
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 216,
          "rate": 0.935064935064935,
          "baseline": 0.9013688074555959,
          "brier": 0.06249658529696634,
          "baselineBrier": 0.0619397447428287,
          "brierSkill": -0.00899003630786055
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 261,
          "rate": 0.8817567567567568,
          "baseline": 0.9053692928872304,
          "brier": 0.10502426696459419,
          "baselineBrier": 0.10497734128956011,
          "brierSkill": -0.00044700765381966434
        }
      ],
      "current": {
        "target": 1464,
        "tail": 8,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 788,
        "hits": 715,
        "lineRate": 0.8947890408484938,
        "predictedRate": 0.9070492336843686,
        "baseline": 0.9060856498873028,
        "edge": 0.0009635837970658478,
        "lower": 0.8932817761988342,
        "upper": 0.919748593144906,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 89.5%（1298/1451），第1/2/3期结束 61/27/12%，当前上一期开出历史 715/788。"
      }
    },
    {
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1317,
        "misses": 134,
        "rate": 0.9076498966230186,
        "baseline": 0.906020073908593,
        "edge": 0.0016298227144256883,
        "stageShare": {
          "first": 0.621867881548975,
          "second": 0.2627182991647684,
          "third": 0.11541381928625664
        },
        "stageCounts": {
          "first": 819,
          "second": 346,
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
            "n": 152,
            "hits": 137
          },
          "after_hit": {
            "n": 816,
            "hits": 734
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
          "windows": 296,
          "hits": 268,
          "rate": 0.9054054054054054
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 207,
          "rate": 0.8961038961038961,
          "baseline": 0.9113826452098265,
          "brier": 0.09490605579678318,
          "baselineBrier": 0.09345174707456448,
          "brierSkill": -0.015562135195378746
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9135971799637025,
          "brier": 0.08648960296273354,
          "baselineBrier": 0.08571831352414432,
          "brierSkill": -0.008997953959651639
        }
      ],
      "current": {
        "target": 1464,
        "tail": 9,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 346,
        "hits": 315,
        "lineRate": 0.907840648456345,
        "predictedRate": 0.9102645163090899,
        "baseline": 0.9170666787949012,
        "edge": -0.006802162485811336,
        "lower": 0.8887684631497245,
        "upper": 0.9281723581174312,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.8%（1317/1451），第1/2/3期结束 62/26/12%，当前连续遗漏1期历史 315/346。"
      }
    },
    {
      "id": "prob1",
      "label": "概率第1",
      "kind": "probability",
      "longTerm": {
        "windows": 1451,
        "hits": 1331,
        "misses": 120,
        "rate": 0.9172984148862853,
        "baseline": 0.9063530422811408,
        "edge": 0.010945372605144499,
        "stageShare": {
          "first": 0.6190833959429001,
          "second": 0.2607062359128475,
          "third": 0.12021036814425244
        },
        "stageCounts": {
          "first": 824,
          "second": 347,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1281,
            "hits": 1176
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
          "windows": 296,
          "hits": 268,
          "rate": 0.9054054054054054
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9091458273236181,
          "brier": 0.09039244859686461,
          "baselineBrier": 0.0900802956628338,
          "brierSkill": -0.0034652743059278013
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9074893759922954,
          "brier": 0.0860431227166563,
          "baselineBrier": 0.08659092371261554,
          "brierSkill": 0.006326309646231709
        }
      ],
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1281,
        "hits": 1176,
        "lineRate": 0.9160433341029376,
        "predictedRate": 0.9180022034450874,
        "baseline": 0.8553392602150206,
        "edge": 0.06266294323006683,
        "lower": 0.9076801904823174,
        "upper": 0.9273174206916505,
        "confidence": "高于基准",
        "reason": "长期新三期窗口 91.7%（1331/1451），第1/2/3期结束 62/26/12%，当前上一期开出历史 1176/1281。"
      }
    },
    {
      "id": "prob2",
      "label": "概率第2",
      "kind": "probability",
      "longTerm": {
        "windows": 1451,
        "hits": 1312,
        "misses": 139,
        "rate": 0.9042039972432805,
        "baseline": 0.9080557915616436,
        "edge": -0.003851794318363133,
        "stageShare": {
          "first": 0.6189024390243902,
          "second": 0.24847560975609756,
          "third": 0.1326219512195122
        },
        "stageCounts": {
          "first": 812,
          "second": 326,
          "third": 174
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1183,
            "hits": 1069
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
          "windows": 296,
          "hits": 260,
          "rate": 0.8783783783783784
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 212,
          "rate": 0.9177489177489178,
          "baseline": 0.9060903825667974,
          "brier": 0.07581308232288107,
          "baselineBrier": 0.0773011018818723,
          "brierSkill": 0.019249655215331063
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 260,
          "rate": 0.8783783783783784,
          "baseline": 0.9084772160174263,
          "brier": 0.1078922732627322,
          "baselineBrier": 0.10716417566782778,
          "brierSkill": -0.006794225685655242
        }
      ],
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1183,
        "hits": 1069,
        "lineRate": 0.9043597519221445,
        "predictedRate": 0.9036468786686973,
        "baseline": 0.9118930865565257,
        "edge": -0.008246207887828372,
        "lower": 0.8920881766403074,
        "upper": 0.9140649921241021,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.4%（1312/1451），第1/2/3期结束 62/25/13%，当前上一期开出历史 1069/1183。"
      }
    },
    {
      "id": "prob3",
      "label": "概率第3",
      "kind": "probability",
      "longTerm": {
        "windows": 1451,
        "hits": 1334,
        "misses": 117,
        "rate": 0.9193659545141282,
        "baseline": 0.9055718145524906,
        "edge": 0.013794139961637586,
        "stageShare": {
          "first": 0.6004497751124438,
          "second": 0.27586206896551724,
          "third": 0.12368815592203898
        },
        "stageCounts": {
          "first": 801,
          "second": 368,
          "third": 165
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1128,
            "hits": 1031
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
            "n": 33,
            "hits": 31
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
          "windows": 296,
          "hits": 272,
          "rate": 0.918918918918919
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 210,
          "rate": 0.9090909090909091,
          "baseline": 0.9037168837740432,
          "brier": 0.08262607764763098,
          "baselineBrier": 0.08323047752552463,
          "brierSkill": 0.007261761506874631
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 272,
          "rate": 0.918918918918919,
          "baseline": 0.9048331560995169,
          "brier": 0.07480229850768347,
          "baselineBrier": 0.07553597902493,
          "brierSkill": 0.009712994081991
        }
      ],
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 281,
        "hits": 263,
        "lineRate": 0.9191897919673875,
        "predictedRate": 0.9348298865094609,
        "baseline": 0.9106693967900266,
        "edge": 0.024160489719434297,
        "lower": 0.9146030675350987,
        "upper": 0.9522288986803908,
        "confidence": "高于基准",
        "reason": "长期新三期窗口 91.9%（1334/1451），第1/2/3期结束 60/28/12%，当前连续遗漏1期历史 263/281。"
      }
    }
  ],
  "ranking": [
    {
      "rank": 1,
      "id": "prob3",
      "label": "概率第3",
      "kind": "probability",
      "longTerm": {
        "windows": 1451,
        "hits": 1334,
        "misses": 117,
        "rate": 0.9193659545141282,
        "baseline": 0.9055718145524906,
        "edge": 0.013794139961637586,
        "stageShare": {
          "first": 0.6004497751124438,
          "second": 0.27586206896551724,
          "third": 0.12368815592203898
        },
        "stageCounts": {
          "first": 801,
          "second": 368,
          "third": 165
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1128,
            "hits": 1031
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
            "n": 33,
            "hits": 31
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
          "windows": 296,
          "hits": 272,
          "rate": 0.918918918918919
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 210,
          "rate": 0.9090909090909091,
          "baseline": 0.9037168837740432,
          "brier": 0.08262607764763098,
          "baselineBrier": 0.08323047752552463,
          "brierSkill": 0.007261761506874631
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 272,
          "rate": 0.918918918918919,
          "baseline": 0.9048331560995169,
          "brier": 0.07480229850768347,
          "baselineBrier": 0.07553597902493,
          "brierSkill": 0.009712994081991
        }
      ],
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 281,
        "hits": 263,
        "lineRate": 0.9191897919673875,
        "predictedRate": 0.9348298865094609,
        "baseline": 0.9106693967900266,
        "edge": 0.024160489719434297,
        "lower": 0.9146030675350987,
        "upper": 0.9522288986803908,
        "confidence": "高于基准",
        "reason": "长期新三期窗口 91.9%（1334/1451），第1/2/3期结束 60/28/12%，当前连续遗漏1期历史 263/281。"
      }
    },
    {
      "rank": 2,
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1329,
        "misses": 122,
        "rate": 0.9159200551343901,
        "baseline": 0.9383701484416478,
        "edge": -0.022450093307257668,
        "stageShare": {
          "first": 0.6320541760722348,
          "second": 0.254326561324304,
          "third": 0.11361926260346125
        },
        "stageCounts": {
          "first": 840,
          "second": 338,
          "third": 151
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
            "n": 337,
            "hits": 305
          },
          "after_two_misses": {
            "n": 150,
            "hits": 139
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
          "windows": 296,
          "hits": 257,
          "rate": 0.8682432432432432
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.9341438982351735,
          "brier": 0.07197799285468132,
          "baselineBrier": 0.07210203565371867,
          "brierSkill": 0.001720378598367045
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 257,
          "rate": 0.8682432432432432,
          "baseline": 0.9285614428890097,
          "brier": 0.1184308159578144,
          "baselineBrier": 0.11814682728216891,
          "brierSkill": -0.002403692779385791
        }
      ],
      "current": {
        "target": 1464,
        "tail": 2,
        "state": "after_three_plus_misses",
        "stateLabel": "连续遗漏3期以上",
        "samples": 121,
        "hits": 112,
        "lineRate": 0.916111145511415,
        "predictedRate": 0.9242710844697043,
        "baseline": 0.9253535500801866,
        "edge": -0.0010824656104823083,
        "lower": 0.8890774382859613,
        "upper": 0.9507900094302516,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 63/25/11%，当前连续遗漏3期以上历史 112/121。"
      }
    },
    {
      "rank": 3,
      "id": "tail6",
      "label": "尾6",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1346,
        "misses": 105,
        "rate": 0.9276361130254996,
        "baseline": 0.9169227508380364,
        "edge": 0.010713362187463216,
        "stageShare": {
          "first": 0.6092124814264487,
          "second": 0.2659732540861813,
          "third": 0.12481426448736999
        },
        "stageCounts": {
          "first": 820,
          "second": 358,
          "third": 168
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 815,
            "hits": 753
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
          "windows": 296,
          "hits": 280,
          "rate": 0.9459459459459459
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.914101679464,
          "brier": 0.0909150308972192,
          "baselineBrier": 0.0898989285526357,
          "brierSkill": -0.011302719186342403
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 280,
          "rate": 0.9459459459459459,
          "baseline": 0.9136963923294065,
          "brier": 0.05176311977584207,
          "baselineBrier": 0.05227905474204874,
          "brierSkill": 0.00986886562414635
        }
      ],
      "current": {
        "target": 1464,
        "tail": 6,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 815,
        "hits": 753,
        "lineRate": 0.9274220123996265,
        "predictedRate": 0.9240101080814281,
        "baseline": 0.9170666787949012,
        "edge": 0.006943429286526914,
        "lower": 0.9111705263237647,
        "upper": 0.9349812098669409,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 92.8%（1346/1451），第1/2/3期结束 61/27/12%，当前上一期开出历史 753/815。"
      }
    },
    {
      "rank": 4,
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1322,
        "misses": 129,
        "rate": 0.9110957960027567,
        "baseline": 0.9096241521538668,
        "edge": 0.0014716438488898698,
        "stageShare": {
          "first": 0.6043872919818457,
          "second": 0.2745839636913767,
          "third": 0.12102874432677761
        },
        "stageCounts": {
          "first": 799,
          "second": 363,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_one_miss": {
            "n": 363,
            "hits": 329
          },
          "after_hit": {
            "n": 795,
            "hits": 732
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
          "windows": 296,
          "hits": 276,
          "rate": 0.9324324324324325
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 209,
          "rate": 0.9047619047619048,
          "baseline": 0.9089090356805571,
          "brier": 0.08620694950223605,
          "baselineBrier": 0.08637437409156325,
          "brierSkill": 0.0019383595086861494
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 276,
          "rate": 0.9324324324324325,
          "baseline": 0.9100719331581135,
          "brier": 0.06400035139790704,
          "baselineBrier": 0.06352503917262321,
          "brierSkill": -0.007482281498358612
        }
      ],
      "current": {
        "target": 1464,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 795,
        "hits": 732,
        "lineRate": 0.9110621423806138,
        "predictedRate": 0.9205168623897083,
        "baseline": 0.9094344288563013,
        "edge": 0.011082433533406988,
        "lower": 0.9076087944063557,
        "upper": 0.932169955902442,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 60/27/12%，当前上一期开出历史 732/795。"
      }
    },
    {
      "rank": 5,
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1316,
        "misses": 135,
        "rate": 0.906960716747071,
        "baseline": 0.9146376918400867,
        "edge": -0.007676975093015681,
        "stageShare": {
          "first": 0.6101823708206687,
          "second": 0.26975683890577506,
          "third": 0.12006079027355623
        },
        "stageCounts": {
          "first": 803,
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
            "n": 800,
            "hits": 735
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
          "windows": 296,
          "hits": 252,
          "rate": 0.8513513513513513
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 219,
          "rate": 0.948051948051948,
          "baseline": 0.9191288645846455,
          "brier": 0.0506222364104259,
          "baselineBrier": 0.05014791876744616,
          "brierSkill": -0.009458371446666058
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 252,
          "rate": 0.8513513513513513,
          "baseline": 0.9157914275599968,
          "brier": 0.12999433136049396,
          "baselineBrier": 0.13068684044173132,
          "brierSkill": 0.005298996279171075
        }
      ],
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 800,
        "hits": 735,
        "lineRate": 0.9070606297074246,
        "predictedRate": 0.9184648934074982,
        "baseline": 0.9118930865565257,
        "edge": 0.0065718068509724725,
        "lower": 0.9055127144036271,
        "upper": 0.930275591146606,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.7%（1316/1451），第1/2/3期结束 61/27/12%，当前上一期开出历史 735/800。"
      }
    },
    {
      "rank": 6,
      "id": "prob1",
      "label": "概率第1",
      "kind": "probability",
      "longTerm": {
        "windows": 1451,
        "hits": 1331,
        "misses": 120,
        "rate": 0.9172984148862853,
        "baseline": 0.9063530422811408,
        "edge": 0.010945372605144499,
        "stageShare": {
          "first": 0.6190833959429001,
          "second": 0.2607062359128475,
          "third": 0.12021036814425244
        },
        "stageCounts": {
          "first": 824,
          "second": 347,
          "third": 160
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1281,
            "hits": 1176
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
          "windows": 296,
          "hits": 268,
          "rate": 0.9054054054054054
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9091458273236181,
          "brier": 0.09039244859686461,
          "baselineBrier": 0.0900802956628338,
          "brierSkill": -0.0034652743059278013
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9074893759922954,
          "brier": 0.0860431227166563,
          "baselineBrier": 0.08659092371261554,
          "brierSkill": 0.006326309646231709
        }
      ],
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1281,
        "hits": 1176,
        "lineRate": 0.9160433341029376,
        "predictedRate": 0.9180022034450874,
        "baseline": 0.8553392602150206,
        "edge": 0.06266294323006683,
        "lower": 0.9076801904823174,
        "upper": 0.9273174206916505,
        "confidence": "高于基准",
        "reason": "长期新三期窗口 91.7%（1331/1451），第1/2/3期结束 62/26/12%，当前上一期开出历史 1176/1281。"
      }
    },
    {
      "rank": 7,
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1322,
        "misses": 129,
        "rate": 0.9110957960027567,
        "baseline": 0.9115538391207002,
        "edge": -0.0004580431179435074,
        "stageShare": {
          "first": 0.6059001512859304,
          "second": 0.26777609682299547,
          "third": 0.12632375189107414
        },
        "stageCounts": {
          "first": 801,
          "second": 354,
          "third": 167
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 796,
            "hits": 726
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
          "windows": 296,
          "hits": 262,
          "rate": 0.8851351351351351
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 208,
          "rate": 0.9004329004329005,
          "baseline": 0.9160271011339205,
          "brier": 0.09122619665965706,
          "baselineBrier": 0.08990699581094128,
          "brierSkill": -0.01467294993917756
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 262,
          "rate": 0.8851351351351351,
          "baseline": 0.9133118398471041,
          "brier": 0.1029106550038176,
          "baselineBrier": 0.10243544074707525,
          "brierSkill": -0.004639158608354288
        }
      ],
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 353,
        "hits": 324,
        "lineRate": 0.9110871586115468,
        "predictedRate": 0.9174845661453913,
        "baseline": 0.9106693967900266,
        "edge": 0.0068151693553647474,
        "lower": 0.8971526491068075,
        "upper": 0.9346805646681248,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 61/27/13%，当前连续遗漏1期历史 324/353。"
      }
    },
    {
      "rank": 8,
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1329,
        "misses": 122,
        "rate": 0.9159200551343901,
        "baseline": 0.9139582480980566,
        "edge": 0.0019618070363335294,
        "stageShare": {
          "first": 0.6019563581640331,
          "second": 0.2708803611738149,
          "third": 0.127163280662152
        },
        "stageCounts": {
          "first": 800,
          "second": 360,
          "third": 169
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 5
          },
          "after_hit": {
            "n": 798,
            "hits": 732
          },
          "after_one_miss": {
            "n": 360,
            "hits": 328
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
          "windows": 296,
          "hits": 279,
          "rate": 0.9425675675675675
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 206,
          "rate": 0.8917748917748918,
          "baseline": 0.9075738715881736,
          "brier": 0.09714222227619354,
          "baselineBrier": 0.09682614881175577,
          "brierSkill": -0.003264339936231986
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 279,
          "rate": 0.9425675675675675,
          "baseline": 0.9091160281059779,
          "brier": 0.0555317326809501,
          "baselineBrier": 0.05532154560804748,
          "brierSkill": -0.003799370942955793
        }
      ],
      "current": {
        "target": 1464,
        "tail": 7,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 798,
        "hits": 732,
        "lineRate": 0.915797042697314,
        "predictedRate": 0.9172566514106922,
        "baseline": 0.9098473411574023,
        "edge": 0.007409310253289947,
        "lower": 0.903941206774862,
        "upper": 0.92893525338513,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 60/27/13%，当前上一期开出历史 732/798。"
      }
    },
    {
      "rank": 9,
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1317,
        "misses": 134,
        "rate": 0.9076498966230186,
        "baseline": 0.906020073908593,
        "edge": 0.0016298227144256883,
        "stageShare": {
          "first": 0.621867881548975,
          "second": 0.2627182991647684,
          "third": 0.11541381928625664
        },
        "stageCounts": {
          "first": 819,
          "second": 346,
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
            "n": 152,
            "hits": 137
          },
          "after_hit": {
            "n": 816,
            "hits": 734
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
          "windows": 296,
          "hits": 268,
          "rate": 0.9054054054054054
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 207,
          "rate": 0.8961038961038961,
          "baseline": 0.9113826452098265,
          "brier": 0.09490605579678318,
          "baselineBrier": 0.09345174707456448,
          "brierSkill": -0.015562135195378746
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9135971799637025,
          "brier": 0.08648960296273354,
          "baselineBrier": 0.08571831352414432,
          "brierSkill": -0.008997953959651639
        }
      ],
      "current": {
        "target": 1464,
        "tail": 9,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 346,
        "hits": 315,
        "lineRate": 0.907840648456345,
        "predictedRate": 0.9102645163090899,
        "baseline": 0.9170666787949012,
        "edge": -0.006802162485811336,
        "lower": 0.8887684631497245,
        "upper": 0.9281723581174312,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.8%（1317/1451），第1/2/3期结束 62/26/12%，当前连续遗漏1期历史 315/346。"
      }
    },
    {
      "rank": 10,
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1298,
        "misses": 153,
        "rate": 0.8945554789800138,
        "baseline": 0.8923966865205613,
        "edge": 0.0021587924594524965,
        "stageShare": {
          "first": 0.6093990755007704,
          "second": 0.2711864406779661,
          "third": 0.11941448382126348
        },
        "stageCounts": {
          "first": 791,
          "second": 352,
          "third": 155
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 4
          },
          "after_one_miss": {
            "n": 351,
            "hits": 313
          },
          "after_two_misses": {
            "n": 154,
            "hits": 133
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
          "windows": 296,
          "hits": 261,
          "rate": 0.8817567567567568
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 216,
          "rate": 0.935064935064935,
          "baseline": 0.9013688074555959,
          "brier": 0.06249658529696634,
          "baselineBrier": 0.0619397447428287,
          "brierSkill": -0.00899003630786055
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 261,
          "rate": 0.8817567567567568,
          "baseline": 0.9053692928872304,
          "brier": 0.10502426696459419,
          "baselineBrier": 0.10497734128956011,
          "brierSkill": -0.00044700765381966434
        }
      ],
      "current": {
        "target": 1464,
        "tail": 8,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 788,
        "hits": 715,
        "lineRate": 0.8947890408484938,
        "predictedRate": 0.9070492336843686,
        "baseline": 0.9060856498873028,
        "edge": 0.0009635837970658478,
        "lower": 0.8932817761988342,
        "upper": 0.919748593144906,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 89.5%（1298/1451），第1/2/3期结束 61/27/12%，当前上一期开出历史 715/788。"
      }
    },
    {
      "rank": 11,
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1309,
        "misses": 142,
        "rate": 0.9021364576154376,
        "baseline": 0.9052091722283556,
        "edge": -0.003072714612918026,
        "stageShare": {
          "first": 0.5889992360580596,
          "second": 0.2750190985485103,
          "third": 0.1359816653934301
        },
        "stageCounts": {
          "first": 771,
          "second": 360,
          "third": 178
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 768,
            "hits": 696
          },
          "after_one_miss": {
            "n": 360,
            "hits": 321
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
          "windows": 296,
          "hits": 274,
          "rate": 0.9256756756756757
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 204,
          "rate": 0.8831168831168831,
          "baseline": 0.9002478996307975,
          "brier": 0.10434663135641319,
          "baselineBrier": 0.10359967091892772,
          "brierSkill": -0.007210065735343996
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 274,
          "rate": 0.9256756756756757,
          "baseline": 0.8965979077734645,
          "brier": 0.06968740407970668,
          "baselineBrier": 0.06972221887090527,
          "brierSkill": 0.0004993356746584299
        }
      ],
      "current": {
        "target": 1464,
        "tail": 4,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 768,
        "hits": 696,
        "lineRate": 0.9020486900141818,
        "predictedRate": 0.9061433677668573,
        "baseline": 0.8978036637001049,
        "edge": 0.00833970406675244,
        "lower": 0.8919088259214333,
        "upper": 0.9188615306512117,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.2%（1309/1451），第1/2/3期结束 59/28/14%，当前上一期开出历史 696/768。"
      }
    },
    {
      "rank": 12,
      "id": "prob2",
      "label": "概率第2",
      "kind": "probability",
      "longTerm": {
        "windows": 1451,
        "hits": 1312,
        "misses": 139,
        "rate": 0.9042039972432805,
        "baseline": 0.9080557915616436,
        "edge": -0.003851794318363133,
        "stageShare": {
          "first": 0.6189024390243902,
          "second": 0.24847560975609756,
          "third": 0.1326219512195122
        },
        "stageCounts": {
          "first": 812,
          "second": 326,
          "third": 174
        },
        "stateCounts": {
          "year_start": {
            "n": 6,
            "hits": 6
          },
          "after_hit": {
            "n": 1183,
            "hits": 1069
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
          "windows": 296,
          "hits": 260,
          "rate": 0.8783783783783784
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 212,
          "rate": 0.9177489177489178,
          "baseline": 0.9060903825667974,
          "brier": 0.07581308232288107,
          "baselineBrier": 0.0773011018818723,
          "brierSkill": 0.019249655215331063
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 260,
          "rate": 0.8783783783783784,
          "baseline": 0.9084772160174263,
          "brier": 0.1078922732627322,
          "baselineBrier": 0.10716417566782778,
          "brierSkill": -0.006794225685655242
        }
      ],
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1183,
        "hits": 1069,
        "lineRate": 0.9043597519221445,
        "predictedRate": 0.9036468786686973,
        "baseline": 0.9118930865565257,
        "edge": -0.008246207887828372,
        "lower": 0.8920881766403074,
        "upper": 0.9140649921241021,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 90.4%（1312/1451），第1/2/3期结束 62/25/13%，当前上一期开出历史 1069/1183。"
      }
    },
    {
      "rank": 13,
      "id": "tail0",
      "label": "尾0",
      "kind": "tail",
      "longTerm": {
        "windows": 1451,
        "hits": 1216,
        "misses": 235,
        "rate": 0.8380427291523087,
        "baseline": 0.8208724008077456,
        "edge": 0.017170328344563113,
        "stageShare": {
          "first": 0.5657894736842105,
          "second": 0.2935855263157895,
          "third": 0.140625
        },
        "stageCounts": {
          "first": 688,
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
            "n": 171,
            "hits": 141
          },
          "after_hit": {
            "n": 687,
            "hits": 595
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
          "windows": 296,
          "hits": 265,
          "rate": 0.8952702702702703
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 231,
          "hits": 213,
          "rate": 0.922077922077922,
          "baseline": 0.8419641649355917,
          "brier": 0.08464199935975993,
          "baselineBrier": 0.07883755317389056,
          "brierSkill": -0.07362539744310181
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 265,
          "rate": 0.8952702702702703,
          "baseline": 0.8515905895932288,
          "brier": 0.09623333685014983,
          "baselineBrier": 0.09599562915087342,
          "brierSkill": -0.00247623460962787
        }
      ],
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 687,
        "hits": 595,
        "lineRate": 0.8383930977761314,
        "predictedRate": 0.8653010777305837,
        "baseline": 0.8553392602150206,
        "edge": 0.009961817515563132,
        "lower": 0.8485790788760227,
        "upper": 0.8818478040860659,
        "confidence": "接近基准",
        "reason": "长期新三期窗口 83.8%（1216/1451），第1/2/3期结束 57/29/14%，当前上一期开出历史 595/687。"
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
        "hits": 411,
        "rate": 0.8896103896103896
      },
      "top3": {
        "n": 693,
        "hits": 623,
        "rate": 0.898989898989899
      },
      "top2Lift": -0.020479520479520508,
      "top3Lift": -0.011100011100011131
    },
    {
      "year": 2026,
      "periods": 296,
      "all": {
        "n": 3848,
        "hits": 3474,
        "rate": 0.9028066528066528
      },
      "top2": {
        "n": 592,
        "hits": 537,
        "rate": 0.9070945945945946
      },
      "top3": {
        "n": 888,
        "hits": 797,
        "rate": 0.8975225225225225
      },
      "top2Lift": 0.004287941787941785,
      "top3Lift": -0.005284130284130328
    }
  ]
};
