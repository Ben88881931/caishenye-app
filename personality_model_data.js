window.APP_PERSONALITY_MODEL = {
  "version": "next-window-v3-20261026",
  "method": "per-line-integrated-window-personality-v3",
  "generatedAt": "2026-10-25T16:53:06.403Z",
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
  "oneTwoThreeWeightMix": true,
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
          "brier": 0.08508789433661396,
          "baselineBrier": 0.07883755317389056,
          "brierSkill": -0.07928126776001188
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 265,
          "rate": 0.8952702702702703,
          "baseline": 0.8515905895932288,
          "brier": 0.09649805983828139,
          "baselineBrier": 0.09599562915087342,
          "brierSkill": -0.005233891291220205
        }
      ],
      "weights": {
        "one": 0.005005631684790066,
        "two": 0.005005631684790066,
        "three": 0.9899887366304199,
        "skills": {
          "one": -0.838004244750308,
          "two": -0.1232640071513762,
          "three": -0.0006930507444142808
        }
      },
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 687,
        "hits": 595,
        "lineRate": 0.8383930977761314,
        "predictedRate": 0.8628386207208817,
        "baseline": 0.8553392602150206,
        "edge": 0.007499360505861086,
        "lower": 0.8485790788760227,
        "upper": 0.8818478040860659,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.48525424900350983,
            "baseline": 0.4750512645249487,
            "edge": 0.010202984478561106,
            "samples": 692,
            "hits": 336,
            "lineRate": 0.4750512645249488
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7534105916958973,
            "baseline": 0.7244288251231447,
            "edge": 0.028981766572752643,
            "samples": 688,
            "hits": 519,
            "lineRate": 0.7207349460347641
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.8653010777305837,
            "baseline": 0.8553392602150206,
            "edge": 0.009961817515563132,
            "samples": 687,
            "hits": 595,
            "lineRate": 0.8383930977761314
          }
        },
        "reason": "长期新三期窗口 83.8%（1216/1451），第1/2/3期结束 57/29/14%，当前上一期开出状态。综合：一期48.5% / 两期75.3% / 三期86.5%，本线权重 1/1/99%。"
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
          "brier": 0.08621744177265005,
          "baselineBrier": 0.08637437409156325,
          "brierSkill": 0.0018168851648850959
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 276,
          "rate": 0.9324324324324325,
          "baseline": 0.9100719331581135,
          "brier": 0.06416826022185532,
          "baselineBrier": 0.06352503917262321,
          "brierSkill": -0.01012547268934716
        }
      ],
      "weights": {
        "one": 0.007264076967767696,
        "two": 0.007264076967767696,
        "three": 0.9854718460644646,
        "skills": {
          "one": -1.3462605998848591,
          "two": -0.15953467349403594,
          "three": -0.006347310185228272
        }
      },
      "current": {
        "target": 1464,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 795,
        "hits": 732,
        "lineRate": 0.9110621423806138,
        "predictedRate": 0.9169259440582075,
        "baseline": 0.9094344288563013,
        "edge": 0.007491515201906163,
        "lower": 0.9076087944063557,
        "upper": 0.932169955902442,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5469165106321334,
            "baseline": 0.5509227614490773,
            "edge": -0.004006250816943835,
            "samples": 801,
            "hits": 438,
            "lineRate": 0.5509227614490773
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7997779680965512,
            "baseline": 0.7983296338154776,
            "edge": 0.0014483342810736044,
            "samples": 799,
            "hits": 639,
            "lineRate": 0.8009077935537756
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9205168623897083,
            "baseline": 0.9094344288563013,
            "edge": 0.011082433533406988,
            "samples": 795,
            "hits": 732,
            "lineRate": 0.9110621423806138
          }
        },
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 60/27/12%，当前上一期开出状态。综合：一期54.7% / 两期80.0% / 三期92.1%，本线权重 1/1/99%。"
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
          "brier": 0.07196823525357691,
          "baselineBrier": 0.07210203565371867,
          "brierSkill": 0.0018557090507729246
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 257,
          "rate": 0.8682432432432432,
          "baseline": 0.9285614428890097,
          "brier": 0.11815663327374337,
          "baselineBrier": 0.11814682728216891,
          "brierSkill": -0.00008299834875002965
        }
      ],
      "weights": {
        "one": 0.005724712310611232,
        "two": 0.005724712310611232,
        "three": 0.9885505753787774,
        "skills": {
          "one": -1.5093724043947816,
          "two": -0.13553244651864116,
          "three": -0.002728287375382221
        }
      },
      "current": {
        "target": 1464,
        "tail": 2,
        "state": "after_three_plus_misses",
        "stateLabel": "连续遗漏3期以上",
        "samples": 121,
        "hits": 112,
        "lineRate": 0.916111145511415,
        "predictedRate": 0.9217204488508843,
        "baseline": 0.9253535500801866,
        "edge": -0.0036331012293022713,
        "lower": 0.8890774382859613,
        "upper": 0.9507900094302516,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5714818962299366,
            "baseline": 0.5789473684210527,
            "edge": -0.0074654721911160404,
            "samples": 121,
            "hits": 69,
            "lineRate": 0.5789473684210527
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8315120109929759,
            "baseline": 0.8227146814404432,
            "edge": 0.008797329552532651,
            "samples": 121,
            "hits": 101,
            "lineRate": 0.8121596775004797
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9242710844697043,
            "baseline": 0.9253535500801866,
            "edge": -0.0010824656104823083,
            "samples": 121,
            "hits": 112,
            "lineRate": 0.916111145511415
          }
        },
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 63/25/11%，当前连续遗漏3期以上状态。综合：一期57.1% / 两期83.2% / 三期92.4%，本线权重 1/1/99%。"
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
          "brier": 0.05083245239265604,
          "baselineBrier": 0.05014791876744616,
          "brierSkill": -0.01365028982327865
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 252,
          "rate": 0.8513513513513513,
          "baseline": 0.9157914275599968,
          "brier": 0.12955903774875385,
          "baselineBrier": 0.13068684044173132,
          "brierSkill": 0.008629810692227347
        }
      ],
      "weights": {
        "one": 0.008151973364459181,
        "two": 0.008151973364459181,
        "three": 0.9836960532710816,
        "skills": {
          "one": -1.6100625304641158,
          "two": -0.1275241763645254,
          "three": -0.008104146022524406
        }
      },
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 800,
        "hits": 735,
        "lineRate": 0.9070606297074246,
        "predictedRate": 0.9146064695412889,
        "baseline": 0.9118930865565257,
        "edge": 0.002713382984763202,
        "lower": 0.9055127144036271,
        "upper": 0.930275591146606,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5617155537064004,
            "baseline": 0.5550239234449761,
            "edge": 0.006691630261424275,
            "samples": 808,
            "hits": 454,
            "lineRate": 0.5550239234449761
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.801902595090849,
            "baseline": 0.8019962912936975,
            "edge": -0.00009369620284849223,
            "samples": 803,
            "hits": 644,
            "lineRate": 0.7982917879884405
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9184648934074982,
            "baseline": 0.9118930865565257,
            "edge": 0.0065718068509724725,
            "samples": 800,
            "hits": 735,
            "lineRate": 0.9070606297074246
          }
        },
        "reason": "长期新三期窗口 90.7%（1316/1451），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.2% / 两期80.2% / 三期91.8%，本线权重 1/1/98%。"
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
          "brier": 0.10423933765615392,
          "baselineBrier": 0.10359967091892772,
          "brierSkill": -0.006174408968217415
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 274,
          "rate": 0.9256756756756757,
          "baseline": 0.8965979077734645,
          "brier": 0.0699387400282217,
          "baselineBrier": 0.06972221887090527,
          "brierSkill": -0.003105482883689392
        }
      ],
      "weights": {
        "one": 0.009300644350865936,
        "two": 0.009300644350865936,
        "three": 0.9813987112982681,
        "skills": {
          "one": -1.3502995259488997,
          "two": -0.15971452746388204,
          "three": -0.010116573084040903
        }
      },
      "current": {
        "target": 1464,
        "tail": 4,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 768,
        "hits": 696,
        "lineRate": 0.9020486900141818,
        "predictedRate": 0.9014002367663507,
        "baseline": 0.8978036637001049,
        "edge": 0.003596573066245834,
        "lower": 0.8919088259214333,
        "upper": 0.9188615306512117,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5328922649677367,
            "baseline": 0.5324675324675324,
            "edge": 0.00042473250020425013,
            "samples": 775,
            "hits": 413,
            "lineRate": 0.5324675324675324
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.769415718387918,
            "baseline": 0.7814133918030022,
            "edge": -0.011997673415084176,
            "samples": 771,
            "hits": 593,
            "lineRate": 0.7803916622421587
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9061433677668573,
            "baseline": 0.8978036637001049,
            "edge": 0.00833970406675244,
            "samples": 768,
            "hits": 696,
            "lineRate": 0.9020486900141818
          }
        },
        "reason": "长期新三期窗口 90.2%（1309/1451），第1/2/3期结束 59/28/14%，当前上一期开出状态。综合：一期53.3% / 两期76.9% / 三期90.6%，本线权重 1/1/98%。"
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
          "brier": 0.09113656132993134,
          "baselineBrier": 0.08990699581094128,
          "brierSkill": -0.013675971573731793
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 262,
          "rate": 0.8851351351351351,
          "baseline": 0.9133118398471041,
          "brier": 0.10272418822453919,
          "baselineBrier": 0.10243544074707525,
          "brierSkill": -0.0028188239866795417
        }
      ],
      "weights": {
        "one": 0.006694126788174851,
        "two": 0.006694126788174851,
        "three": 0.9866117464236502,
        "skills": {
          "one": -1.914243502941627,
          "two": -0.21388634383270522,
          "three": -0.005104309227309978
        }
      },
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 353,
        "hits": 324,
        "lineRate": 0.9110871586115468,
        "predictedRate": 0.9141313288187991,
        "baseline": 0.9106693967900266,
        "edge": 0.003461932028772541,
        "lower": 0.8971526491068075,
        "upper": 0.9346805646681248,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.532073050130161,
            "baseline": 0.5529733424470267,
            "edge": -0.020900292316865632,
            "samples": 356,
            "hits": 189,
            "lineRate": 0.5529733424470267
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.801973791218119,
            "baseline": 0.8001671674370168,
            "edge": 0.0018066237811021901,
            "samples": 354,
            "hits": 284,
            "lineRate": 0.7969098957788234
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9174845661453913,
            "baseline": 0.9106693967900266,
            "edge": 0.0068151693553647474,
            "samples": 353,
            "hits": 324,
            "lineRate": 0.9110871586115468
          }
        },
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 61/27/13%，当前连续遗漏1期状态。综合：一期53.2% / 两期80.2% / 三期91.7%，本线权重 1/1/99%。"
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
          "brier": 0.09071770369639053,
          "baselineBrier": 0.0898989285526357,
          "brierSkill": -0.009107729724225022
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 280,
          "rate": 0.9459459459459459,
          "baseline": 0.9136963923294065,
          "brier": 0.051928635840895764,
          "baselineBrier": 0.05227905474204874,
          "brierSkill": 0.006702854573059636
        }
      ],
      "weights": {
        "one": 0.008259944245855248,
        "two": 0.008259944245855248,
        "three": 0.9834801115082894,
        "skills": {
          "one": -1.9853006583726924,
          "two": -0.1945203516108489,
          "three": -0.008304806332194659
        }
      },
      "current": {
        "target": 1464,
        "tail": 6,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 815,
        "hits": 753,
        "lineRate": 0.9274220123996265,
        "predictedRate": 0.9199340719334039,
        "baseline": 0.9170666787949012,
        "edge": 0.002867393138502705,
        "lower": 0.9111705263237647,
        "upper": 0.9349812098669409,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.560235107341307,
            "baseline": 0.5639097744360902,
            "edge": -0.003674667094783257,
            "samples": 823,
            "hits": 461,
            "lineRate": 0.5639097744360901
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7943149319411892,
            "baseline": 0.8098253151676184,
            "edge": -0.01551038322642917,
            "samples": 820,
            "hits": 651,
            "lineRate": 0.8112271415299452
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9240101080814281,
            "baseline": 0.9170666787949012,
            "edge": 0.006943429286526914,
            "samples": 815,
            "hits": 753,
            "lineRate": 0.9274220123996265
          }
        },
        "reason": "长期新三期窗口 92.8%（1346/1451），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.0% / 两期79.4% / 三期92.4%，本线权重 1/1/98%。"
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
          "brier": 0.0969980634854422,
          "baselineBrier": 0.09682614881175577,
          "brierSkill": -0.0017754984143865116
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 279,
          "rate": 0.9425675675675675,
          "baseline": 0.9091160281059779,
          "brier": 0.055742965388740615,
          "baselineBrier": 0.05532154560804748,
          "brierSkill": -0.007617642928469337
        }
      ],
      "weights": {
        "one": 0.007293588248063269,
        "two": 0.007293588248063269,
        "three": 0.9854128235038734,
        "skills": {
          "one": -1.5934126863275049,
          "two": -0.14080309676460678,
          "three": -0.006409024647411776
        }
      },
      "current": {
        "target": 1464,
        "tail": 7,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 798,
        "hits": 732,
        "lineRate": 0.915797042697314,
        "predictedRate": 0.9136551168767147,
        "baseline": 0.9098473411574023,
        "edge": 0.003807775719312456,
        "lower": 0.903941206774862,
        "upper": 0.92893525338513,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5492492415175795,
            "baseline": 0.5516062884483938,
            "edge": -0.0023570469308142883,
            "samples": 803,
            "hits": 441,
            "lineRate": 0.5516062884483937
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.791469455482199,
            "baseline": 0.798943079440975,
            "edge": -0.007473623958775932,
            "samples": 800,
            "hits": 633,
            "lineRate": 0.8002476747701609
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9172566514106922,
            "baseline": 0.9098473411574023,
            "edge": 0.007409310253289947,
            "samples": 798,
            "hits": 732,
            "lineRate": 0.915797042697314
          }
        },
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 60/27/13%，当前上一期开出状态。综合：一期54.9% / 两期79.1% / 三期91.7%，本线权重 1/1/99%。"
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
          "brier": 0.06270195775348202,
          "baselineBrier": 0.0619397447428287,
          "brierSkill": -0.012305717658637416
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 261,
          "rate": 0.8817567567567568,
          "baseline": 0.9053692928872304,
          "brier": 0.10494499090619738,
          "baselineBrier": 0.10497734128956011,
          "brierSkill": 0.00030816539041023105
        }
      ],
      "weights": {
        "one": 0.005779305280114473,
        "two": 0.005779305280114473,
        "three": 0.988441389439771,
        "skills": {
          "one": -1.2947760660012233,
          "two": -0.13767391037068655,
          "three": -0.0028723119991835855
        }
      },
      "current": {
        "target": 1464,
        "tail": 8,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 788,
        "hits": 715,
        "lineRate": 0.8947890408484938,
        "predictedRate": 0.9044283292950572,
        "baseline": 0.9060856498873028,
        "edge": -0.001657320592245548,
        "lower": 0.8932817761988342,
        "upper": 0.919748593144906,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5557166759620747,
            "baseline": 0.5454545454545454,
            "edge": 0.010262130507529332,
            "samples": 795,
            "hits": 442,
            "lineRate": 0.5454545454545454
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8048836177889023,
            "baseline": 0.7933884297520661,
            "edge": 0.011495188036836135,
            "samples": 791,
            "hits": 637,
            "lineRate": 0.788030701339988
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9070492336843686,
            "baseline": 0.9060856498873028,
            "edge": 0.0009635837970658478,
            "samples": 788,
            "hits": 715,
            "lineRate": 0.8947890408484938
          }
        },
        "reason": "长期新三期窗口 89.5%（1298/1451），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期55.6% / 两期80.5% / 三期90.7%，本线权重 1/1/99%。"
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
          "brier": 0.09483767654153175,
          "baselineBrier": 0.09345174707456448,
          "brierSkill": -0.01483042864743278
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9135971799637025,
          "brier": 0.08647060745278234,
          "baselineBrier": 0.08571831352414432,
          "brierSkill": -0.008776350090300422
        }
      ],
      "weights": {
        "one": 0.0050863716669295785,
        "two": 0.0050863716669295785,
        "three": 0.9898272566661408,
        "skills": {
          "one": -1.68693782750666,
          "two": -0.2566815992280198,
          "three": -0.0009355145166922707
        }
      },
      "current": {
        "target": 1464,
        "tail": 9,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 346,
        "hits": 315,
        "lineRate": 0.907840648456345,
        "predictedRate": 0.907757139162826,
        "baseline": 0.9170666787949012,
        "edge": -0.009309539632075259,
        "lower": 0.8887684631497245,
        "upper": 0.9281723581174312,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5617295270697068,
            "baseline": 0.5639097744360902,
            "edge": -0.0021802473663834476,
            "samples": 349,
            "hits": 196,
            "lineRate": 0.5639097744360901
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7658396295397543,
            "baseline": 0.8098253151676184,
            "edge": -0.04398568562786409,
            "samples": 347,
            "hits": 265,
            "lineRate": 0.8031572020544913
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9102645163090899,
            "baseline": 0.9170666787949012,
            "edge": -0.006802162485811336,
            "samples": 346,
            "hits": 315,
            "lineRate": 0.907840648456345
          }
        },
        "reason": "长期新三期窗口 90.8%（1317/1451），第1/2/3期结束 62/26/12%，当前连续遗漏1期状态。综合：一期56.2% / 两期76.6% / 三期91.0%，本线权重 1/1/99%。"
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
          "brier": 0.09035570498823947,
          "baselineBrier": 0.0900802956628338,
          "brierSkill": -0.0030573759042322735
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9074893759922954,
          "brier": 0.08602378977824876,
          "baselineBrier": 0.08659092371261554,
          "brierSkill": 0.006549577138696638
        }
      ],
      "weights": {
        "one": 0.0018296213330331297,
        "two": 0.0018296213330331297,
        "three": 0.9963407573339337,
        "skills": {
          "one": -1.5705251490278749,
          "two": -0.12847670175876802,
          "three": 0.014499704519619239
        }
      },
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1281,
        "hits": 1176,
        "lineRate": 0.9160433341029376,
        "predictedRate": 0.9171828624822008,
        "baseline": 0.8553392602150206,
        "edge": 0.06184360226718022,
        "lower": 0.9076801904823174,
        "upper": 0.9273174206916505,
        "confidence": "高于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.57722779003169,
            "baseline": 0.4750512645249487,
            "edge": 0.10217652550674128,
            "samples": 1292,
            "hits": 746,
            "lineRate": 0.566143026078867
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8109566510034767,
            "baseline": 0.7244288251231447,
            "edge": 0.08652782588033203,
            "samples": 1286,
            "hits": 1043,
            "lineRate": 0.8054693105270304
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9180022034450874,
            "baseline": 0.8553392602150206,
            "edge": 0.06266294323006683,
            "samples": 1281,
            "hits": 1176,
            "lineRate": 0.9160433341029376
          }
        },
        "reason": "长期新三期窗口 91.7%（1331/1451），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.7% / 两期81.1% / 三期91.8%，本线权重 0/0/100%。"
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
          "brier": 0.0758595817986289,
          "baselineBrier": 0.0773011018818723,
          "brierSkill": 0.018648118178784312
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 260,
          "rate": 0.8783783783783784,
          "baseline": 0.9084772160174263,
          "brier": 0.10774657761038854,
          "baselineBrier": 0.10716417566782778,
          "brierSkill": -0.005434670111829298
        }
      ],
      "weights": {
        "one": 0.005730212931890993,
        "two": 0.005730212931890993,
        "three": 0.988539574136218,
        "skills": {
          "one": -0.9719920316846788,
          "two": -0.10383586390471833,
          "three": -0.0027428602187302698
        }
      },
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1183,
        "hits": 1069,
        "lineRate": 0.9043597519221445,
        "predictedRate": 0.9010016850421518,
        "baseline": 0.9118930865565257,
        "edge": -0.010891401514373844,
        "lower": 0.8920881766403074,
        "upper": 0.9140649921241021,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5596646689255461,
            "baseline": 0.5550239234449761,
            "edge": 0.00464074548057003,
            "samples": 1190,
            "hits": 666,
            "lineRate": 0.5597124699955454
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7860068663433135,
            "baseline": 0.8019962912936975,
            "edge": -0.015989424950384024,
            "samples": 1187,
            "hits": 933,
            "lineRate": 0.7855143838189718
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9036468786686973,
            "baseline": 0.9118930865565257,
            "edge": -0.008246207887828372,
            "samples": 1183,
            "hits": 1069,
            "lineRate": 0.9043597519221445
          }
        },
        "reason": "长期新三期窗口 90.4%（1312/1451），第1/2/3期结束 62/25/13%，当前上一期开出状态。综合：一期56.0% / 两期78.6% / 三期90.4%，本线权重 1/1/99%。"
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
          "brier": 0.08259801209729621,
          "baselineBrier": 0.08323047752552463,
          "brierSkill": 0.007598964310092549
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 272,
          "rate": 0.918918918918919,
          "baseline": 0.9048331560995169,
          "brier": 0.07479574712594637,
          "baselineBrier": 0.07553597902493,
          "brierSkill": 0.009799726018502097
        }
      ],
      "weights": {
        "one": 0.0032921656493678972,
        "two": 0.0032921656493678972,
        "three": 0.9934156687012643,
        "skills": {
          "one": -2.189889123116835,
          "two": -0.24163269985024316,
          "three": 0.005644053625580625
        }
      },
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 281,
        "hits": 263,
        "lineRate": 0.9191897919673875,
        "predictedRate": 0.9331165525535309,
        "baseline": 0.9106693967900266,
        "edge": 0.022447155763504312,
        "lower": 0.9146030675350987,
        "upper": 0.9522288986803908,
        "confidence": "高于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5415922900567393,
            "baseline": 0.5529733424470267,
            "edge": -0.011381052390287416,
            "samples": 281,
            "hits": 152,
            "lineRate": 0.5509639653539256
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.807639856163075,
            "baseline": 0.8001671674370168,
            "edge": 0.007472688726058219,
            "samples": 281,
            "hits": 227,
            "lineRate": 0.8049798352542774
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9348298865094609,
            "baseline": 0.9106693967900266,
            "edge": 0.024160489719434297,
            "samples": 281,
            "hits": 263,
            "lineRate": 0.9191897919673875
          }
        },
        "reason": "长期新三期窗口 91.9%（1334/1451），第1/2/3期结束 60/28/12%，当前连续遗漏1期状态。综合：一期54.2% / 两期80.8% / 三期93.5%，本线权重 0/0/99%。"
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
          "brier": 0.08259801209729621,
          "baselineBrier": 0.08323047752552463,
          "brierSkill": 0.007598964310092549
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 272,
          "rate": 0.918918918918919,
          "baseline": 0.9048331560995169,
          "brier": 0.07479574712594637,
          "baselineBrier": 0.07553597902493,
          "brierSkill": 0.009799726018502097
        }
      ],
      "weights": {
        "one": 0.0032921656493678972,
        "two": 0.0032921656493678972,
        "three": 0.9934156687012643,
        "skills": {
          "one": -2.189889123116835,
          "two": -0.24163269985024316,
          "three": 0.005644053625580625
        }
      },
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 281,
        "hits": 263,
        "lineRate": 0.9191897919673875,
        "predictedRate": 0.9331165525535309,
        "baseline": 0.9106693967900266,
        "edge": 0.022447155763504312,
        "lower": 0.9146030675350987,
        "upper": 0.9522288986803908,
        "confidence": "高于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5415922900567393,
            "baseline": 0.5529733424470267,
            "edge": -0.011381052390287416,
            "samples": 281,
            "hits": 152,
            "lineRate": 0.5509639653539256
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.807639856163075,
            "baseline": 0.8001671674370168,
            "edge": 0.007472688726058219,
            "samples": 281,
            "hits": 227,
            "lineRate": 0.8049798352542774
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9348298865094609,
            "baseline": 0.9106693967900266,
            "edge": 0.024160489719434297,
            "samples": 281,
            "hits": 263,
            "lineRate": 0.9191897919673875
          }
        },
        "reason": "长期新三期窗口 91.9%（1334/1451），第1/2/3期结束 60/28/12%，当前连续遗漏1期状态。综合：一期54.2% / 两期80.8% / 三期93.5%，本线权重 0/0/99%。"
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
          "brier": 0.07196823525357691,
          "baselineBrier": 0.07210203565371867,
          "brierSkill": 0.0018557090507729246
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 257,
          "rate": 0.8682432432432432,
          "baseline": 0.9285614428890097,
          "brier": 0.11815663327374337,
          "baselineBrier": 0.11814682728216891,
          "brierSkill": -0.00008299834875002965
        }
      ],
      "weights": {
        "one": 0.005724712310611232,
        "two": 0.005724712310611232,
        "three": 0.9885505753787774,
        "skills": {
          "one": -1.5093724043947816,
          "two": -0.13553244651864116,
          "three": -0.002728287375382221
        }
      },
      "current": {
        "target": 1464,
        "tail": 2,
        "state": "after_three_plus_misses",
        "stateLabel": "连续遗漏3期以上",
        "samples": 121,
        "hits": 112,
        "lineRate": 0.916111145511415,
        "predictedRate": 0.9217204488508843,
        "baseline": 0.9253535500801866,
        "edge": -0.0036331012293022713,
        "lower": 0.8890774382859613,
        "upper": 0.9507900094302516,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5714818962299366,
            "baseline": 0.5789473684210527,
            "edge": -0.0074654721911160404,
            "samples": 121,
            "hits": 69,
            "lineRate": 0.5789473684210527
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8315120109929759,
            "baseline": 0.8227146814404432,
            "edge": 0.008797329552532651,
            "samples": 121,
            "hits": 101,
            "lineRate": 0.8121596775004797
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9242710844697043,
            "baseline": 0.9253535500801866,
            "edge": -0.0010824656104823083,
            "samples": 121,
            "hits": 112,
            "lineRate": 0.916111145511415
          }
        },
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 63/25/11%，当前连续遗漏3期以上状态。综合：一期57.1% / 两期83.2% / 三期92.4%，本线权重 1/1/99%。"
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
          "brier": 0.09071770369639053,
          "baselineBrier": 0.0898989285526357,
          "brierSkill": -0.009107729724225022
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 280,
          "rate": 0.9459459459459459,
          "baseline": 0.9136963923294065,
          "brier": 0.051928635840895764,
          "baselineBrier": 0.05227905474204874,
          "brierSkill": 0.006702854573059636
        }
      ],
      "weights": {
        "one": 0.008259944245855248,
        "two": 0.008259944245855248,
        "three": 0.9834801115082894,
        "skills": {
          "one": -1.9853006583726924,
          "two": -0.1945203516108489,
          "three": -0.008304806332194659
        }
      },
      "current": {
        "target": 1464,
        "tail": 6,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 815,
        "hits": 753,
        "lineRate": 0.9274220123996265,
        "predictedRate": 0.9199340719334039,
        "baseline": 0.9170666787949012,
        "edge": 0.002867393138502705,
        "lower": 0.9111705263237647,
        "upper": 0.9349812098669409,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.560235107341307,
            "baseline": 0.5639097744360902,
            "edge": -0.003674667094783257,
            "samples": 823,
            "hits": 461,
            "lineRate": 0.5639097744360901
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7943149319411892,
            "baseline": 0.8098253151676184,
            "edge": -0.01551038322642917,
            "samples": 820,
            "hits": 651,
            "lineRate": 0.8112271415299452
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9240101080814281,
            "baseline": 0.9170666787949012,
            "edge": 0.006943429286526914,
            "samples": 815,
            "hits": 753,
            "lineRate": 0.9274220123996265
          }
        },
        "reason": "长期新三期窗口 92.8%（1346/1451），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.0% / 两期79.4% / 三期92.4%，本线权重 1/1/98%。"
      }
    },
    {
      "rank": 4,
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
          "brier": 0.09035570498823947,
          "baselineBrier": 0.0900802956628338,
          "brierSkill": -0.0030573759042322735
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9074893759922954,
          "brier": 0.08602378977824876,
          "baselineBrier": 0.08659092371261554,
          "brierSkill": 0.006549577138696638
        }
      ],
      "weights": {
        "one": 0.0018296213330331297,
        "two": 0.0018296213330331297,
        "three": 0.9963407573339337,
        "skills": {
          "one": -1.5705251490278749,
          "two": -0.12847670175876802,
          "three": 0.014499704519619239
        }
      },
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1281,
        "hits": 1176,
        "lineRate": 0.9160433341029376,
        "predictedRate": 0.9171828624822008,
        "baseline": 0.8553392602150206,
        "edge": 0.06184360226718022,
        "lower": 0.9076801904823174,
        "upper": 0.9273174206916505,
        "confidence": "高于基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.57722779003169,
            "baseline": 0.4750512645249487,
            "edge": 0.10217652550674128,
            "samples": 1292,
            "hits": 746,
            "lineRate": 0.566143026078867
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8109566510034767,
            "baseline": 0.7244288251231447,
            "edge": 0.08652782588033203,
            "samples": 1286,
            "hits": 1043,
            "lineRate": 0.8054693105270304
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9180022034450874,
            "baseline": 0.8553392602150206,
            "edge": 0.06266294323006683,
            "samples": 1281,
            "hits": 1176,
            "lineRate": 0.9160433341029376
          }
        },
        "reason": "长期新三期窗口 91.7%（1331/1451），第1/2/3期结束 62/26/12%，当前上一期开出状态。综合：一期57.7% / 两期81.1% / 三期91.8%，本线权重 0/0/100%。"
      }
    },
    {
      "rank": 5,
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
          "brier": 0.08621744177265005,
          "baselineBrier": 0.08637437409156325,
          "brierSkill": 0.0018168851648850959
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 276,
          "rate": 0.9324324324324325,
          "baseline": 0.9100719331581135,
          "brier": 0.06416826022185532,
          "baselineBrier": 0.06352503917262321,
          "brierSkill": -0.01012547268934716
        }
      ],
      "weights": {
        "one": 0.007264076967767696,
        "two": 0.007264076967767696,
        "three": 0.9854718460644646,
        "skills": {
          "one": -1.3462605998848591,
          "two": -0.15953467349403594,
          "three": -0.006347310185228272
        }
      },
      "current": {
        "target": 1464,
        "tail": 1,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 795,
        "hits": 732,
        "lineRate": 0.9110621423806138,
        "predictedRate": 0.9169259440582075,
        "baseline": 0.9094344288563013,
        "edge": 0.007491515201906163,
        "lower": 0.9076087944063557,
        "upper": 0.932169955902442,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5469165106321334,
            "baseline": 0.5509227614490773,
            "edge": -0.004006250816943835,
            "samples": 801,
            "hits": 438,
            "lineRate": 0.5509227614490773
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7997779680965512,
            "baseline": 0.7983296338154776,
            "edge": 0.0014483342810736044,
            "samples": 799,
            "hits": 639,
            "lineRate": 0.8009077935537756
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9205168623897083,
            "baseline": 0.9094344288563013,
            "edge": 0.011082433533406988,
            "samples": 795,
            "hits": 732,
            "lineRate": 0.9110621423806138
          }
        },
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 60/27/12%，当前上一期开出状态。综合：一期54.7% / 两期80.0% / 三期92.1%，本线权重 1/1/99%。"
      }
    },
    {
      "rank": 6,
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
          "brier": 0.05083245239265604,
          "baselineBrier": 0.05014791876744616,
          "brierSkill": -0.01365028982327865
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 252,
          "rate": 0.8513513513513513,
          "baseline": 0.9157914275599968,
          "brier": 0.12955903774875385,
          "baselineBrier": 0.13068684044173132,
          "brierSkill": 0.008629810692227347
        }
      ],
      "weights": {
        "one": 0.008151973364459181,
        "two": 0.008151973364459181,
        "three": 0.9836960532710816,
        "skills": {
          "one": -1.6100625304641158,
          "two": -0.1275241763645254,
          "three": -0.008104146022524406
        }
      },
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 800,
        "hits": 735,
        "lineRate": 0.9070606297074246,
        "predictedRate": 0.9146064695412889,
        "baseline": 0.9118930865565257,
        "edge": 0.002713382984763202,
        "lower": 0.9055127144036271,
        "upper": 0.930275591146606,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5617155537064004,
            "baseline": 0.5550239234449761,
            "edge": 0.006691630261424275,
            "samples": 808,
            "hits": 454,
            "lineRate": 0.5550239234449761
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.801902595090849,
            "baseline": 0.8019962912936975,
            "edge": -0.00009369620284849223,
            "samples": 803,
            "hits": 644,
            "lineRate": 0.7982917879884405
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9184648934074982,
            "baseline": 0.9118930865565257,
            "edge": 0.0065718068509724725,
            "samples": 800,
            "hits": 735,
            "lineRate": 0.9070606297074246
          }
        },
        "reason": "长期新三期窗口 90.7%（1316/1451），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期56.2% / 两期80.2% / 三期91.8%，本线权重 1/1/98%。"
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
          "brier": 0.09113656132993134,
          "baselineBrier": 0.08990699581094128,
          "brierSkill": -0.013675971573731793
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 262,
          "rate": 0.8851351351351351,
          "baseline": 0.9133118398471041,
          "brier": 0.10272418822453919,
          "baselineBrier": 0.10243544074707525,
          "brierSkill": -0.0028188239866795417
        }
      ],
      "weights": {
        "one": 0.006694126788174851,
        "two": 0.006694126788174851,
        "three": 0.9866117464236502,
        "skills": {
          "one": -1.914243502941627,
          "two": -0.21388634383270522,
          "three": -0.005104309227309978
        }
      },
      "current": {
        "target": 1464,
        "tail": 5,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 353,
        "hits": 324,
        "lineRate": 0.9110871586115468,
        "predictedRate": 0.9141313288187991,
        "baseline": 0.9106693967900266,
        "edge": 0.003461932028772541,
        "lower": 0.8971526491068075,
        "upper": 0.9346805646681248,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.532073050130161,
            "baseline": 0.5529733424470267,
            "edge": -0.020900292316865632,
            "samples": 356,
            "hits": 189,
            "lineRate": 0.5529733424470267
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.801973791218119,
            "baseline": 0.8001671674370168,
            "edge": 0.0018066237811021901,
            "samples": 354,
            "hits": 284,
            "lineRate": 0.7969098957788234
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9174845661453913,
            "baseline": 0.9106693967900266,
            "edge": 0.0068151693553647474,
            "samples": 353,
            "hits": 324,
            "lineRate": 0.9110871586115468
          }
        },
        "reason": "长期新三期窗口 91.1%（1322/1451），第1/2/3期结束 61/27/13%，当前连续遗漏1期状态。综合：一期53.2% / 两期80.2% / 三期91.7%，本线权重 1/1/99%。"
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
          "brier": 0.0969980634854422,
          "baselineBrier": 0.09682614881175577,
          "brierSkill": -0.0017754984143865116
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 279,
          "rate": 0.9425675675675675,
          "baseline": 0.9091160281059779,
          "brier": 0.055742965388740615,
          "baselineBrier": 0.05532154560804748,
          "brierSkill": -0.007617642928469337
        }
      ],
      "weights": {
        "one": 0.007293588248063269,
        "two": 0.007293588248063269,
        "three": 0.9854128235038734,
        "skills": {
          "one": -1.5934126863275049,
          "two": -0.14080309676460678,
          "three": -0.006409024647411776
        }
      },
      "current": {
        "target": 1464,
        "tail": 7,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 798,
        "hits": 732,
        "lineRate": 0.915797042697314,
        "predictedRate": 0.9136551168767147,
        "baseline": 0.9098473411574023,
        "edge": 0.003807775719312456,
        "lower": 0.903941206774862,
        "upper": 0.92893525338513,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5492492415175795,
            "baseline": 0.5516062884483938,
            "edge": -0.0023570469308142883,
            "samples": 803,
            "hits": 441,
            "lineRate": 0.5516062884483937
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.791469455482199,
            "baseline": 0.798943079440975,
            "edge": -0.007473623958775932,
            "samples": 800,
            "hits": 633,
            "lineRate": 0.8002476747701609
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9172566514106922,
            "baseline": 0.9098473411574023,
            "edge": 0.007409310253289947,
            "samples": 798,
            "hits": 732,
            "lineRate": 0.915797042697314
          }
        },
        "reason": "长期新三期窗口 91.6%（1329/1451），第1/2/3期结束 60/27/13%，当前上一期开出状态。综合：一期54.9% / 两期79.1% / 三期91.7%，本线权重 1/1/99%。"
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
          "brier": 0.09483767654153175,
          "baselineBrier": 0.09345174707456448,
          "brierSkill": -0.01483042864743278
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 268,
          "rate": 0.9054054054054054,
          "baseline": 0.9135971799637025,
          "brier": 0.08647060745278234,
          "baselineBrier": 0.08571831352414432,
          "brierSkill": -0.008776350090300422
        }
      ],
      "weights": {
        "one": 0.0050863716669295785,
        "two": 0.0050863716669295785,
        "three": 0.9898272566661408,
        "skills": {
          "one": -1.68693782750666,
          "two": -0.2566815992280198,
          "three": -0.0009355145166922707
        }
      },
      "current": {
        "target": 1464,
        "tail": 9,
        "state": "after_one_miss",
        "stateLabel": "连续遗漏1期",
        "samples": 346,
        "hits": 315,
        "lineRate": 0.907840648456345,
        "predictedRate": 0.907757139162826,
        "baseline": 0.9170666787949012,
        "edge": -0.009309539632075259,
        "lower": 0.8887684631497245,
        "upper": 0.9281723581174312,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5617295270697068,
            "baseline": 0.5639097744360902,
            "edge": -0.0021802473663834476,
            "samples": 349,
            "hits": 196,
            "lineRate": 0.5639097744360901
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7658396295397543,
            "baseline": 0.8098253151676184,
            "edge": -0.04398568562786409,
            "samples": 347,
            "hits": 265,
            "lineRate": 0.8031572020544913
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9102645163090899,
            "baseline": 0.9170666787949012,
            "edge": -0.006802162485811336,
            "samples": 346,
            "hits": 315,
            "lineRate": 0.907840648456345
          }
        },
        "reason": "长期新三期窗口 90.8%（1317/1451），第1/2/3期结束 62/26/12%，当前连续遗漏1期状态。综合：一期56.2% / 两期76.6% / 三期91.0%，本线权重 1/1/99%。"
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
          "brier": 0.06270195775348202,
          "baselineBrier": 0.0619397447428287,
          "brierSkill": -0.012305717658637416
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 261,
          "rate": 0.8817567567567568,
          "baseline": 0.9053692928872304,
          "brier": 0.10494499090619738,
          "baselineBrier": 0.10497734128956011,
          "brierSkill": 0.00030816539041023105
        }
      ],
      "weights": {
        "one": 0.005779305280114473,
        "two": 0.005779305280114473,
        "three": 0.988441389439771,
        "skills": {
          "one": -1.2947760660012233,
          "two": -0.13767391037068655,
          "three": -0.0028723119991835855
        }
      },
      "current": {
        "target": 1464,
        "tail": 8,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 788,
        "hits": 715,
        "lineRate": 0.8947890408484938,
        "predictedRate": 0.9044283292950572,
        "baseline": 0.9060856498873028,
        "edge": -0.001657320592245548,
        "lower": 0.8932817761988342,
        "upper": 0.919748593144906,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5557166759620747,
            "baseline": 0.5454545454545454,
            "edge": 0.010262130507529332,
            "samples": 795,
            "hits": 442,
            "lineRate": 0.5454545454545454
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.8048836177889023,
            "baseline": 0.7933884297520661,
            "edge": 0.011495188036836135,
            "samples": 791,
            "hits": 637,
            "lineRate": 0.788030701339988
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9070492336843686,
            "baseline": 0.9060856498873028,
            "edge": 0.0009635837970658478,
            "samples": 788,
            "hits": 715,
            "lineRate": 0.8947890408484938
          }
        },
        "reason": "长期新三期窗口 89.5%（1298/1451），第1/2/3期结束 61/27/12%，当前上一期开出状态。综合：一期55.6% / 两期80.5% / 三期90.7%，本线权重 1/1/99%。"
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
          "brier": 0.10423933765615392,
          "baselineBrier": 0.10359967091892772,
          "brierSkill": -0.006174408968217415
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 274,
          "rate": 0.9256756756756757,
          "baseline": 0.8965979077734645,
          "brier": 0.0699387400282217,
          "baselineBrier": 0.06972221887090527,
          "brierSkill": -0.003105482883689392
        }
      ],
      "weights": {
        "one": 0.009300644350865936,
        "two": 0.009300644350865936,
        "three": 0.9813987112982681,
        "skills": {
          "one": -1.3502995259488997,
          "two": -0.15971452746388204,
          "three": -0.010116573084040903
        }
      },
      "current": {
        "target": 1464,
        "tail": 4,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 768,
        "hits": 696,
        "lineRate": 0.9020486900141818,
        "predictedRate": 0.9014002367663507,
        "baseline": 0.8978036637001049,
        "edge": 0.003596573066245834,
        "lower": 0.8919088259214333,
        "upper": 0.9188615306512117,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5328922649677367,
            "baseline": 0.5324675324675324,
            "edge": 0.00042473250020425013,
            "samples": 775,
            "hits": 413,
            "lineRate": 0.5324675324675324
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.769415718387918,
            "baseline": 0.7814133918030022,
            "edge": -0.011997673415084176,
            "samples": 771,
            "hits": 593,
            "lineRate": 0.7803916622421587
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9061433677668573,
            "baseline": 0.8978036637001049,
            "edge": 0.00833970406675244,
            "samples": 768,
            "hits": 696,
            "lineRate": 0.9020486900141818
          }
        },
        "reason": "长期新三期窗口 90.2%（1309/1451），第1/2/3期结束 59/28/14%，当前上一期开出状态。综合：一期53.3% / 两期76.9% / 三期90.6%，本线权重 1/1/98%。"
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
          "brier": 0.0758595817986289,
          "baselineBrier": 0.0773011018818723,
          "brierSkill": 0.018648118178784312
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 260,
          "rate": 0.8783783783783784,
          "baseline": 0.9084772160174263,
          "brier": 0.10774657761038854,
          "baselineBrier": 0.10716417566782778,
          "brierSkill": -0.005434670111829298
        }
      ],
      "weights": {
        "one": 0.005730212931890993,
        "two": 0.005730212931890993,
        "three": 0.988539574136218,
        "skills": {
          "one": -0.9719920316846788,
          "two": -0.10383586390471833,
          "three": -0.0027428602187302698
        }
      },
      "current": {
        "target": 1464,
        "tail": 3,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 1183,
        "hits": 1069,
        "lineRate": 0.9043597519221445,
        "predictedRate": 0.9010016850421518,
        "baseline": 0.9118930865565257,
        "edge": -0.010891401514373844,
        "lower": 0.8920881766403074,
        "upper": 0.9140649921241021,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.5596646689255461,
            "baseline": 0.5550239234449761,
            "edge": 0.00464074548057003,
            "samples": 1190,
            "hits": 666,
            "lineRate": 0.5597124699955454
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7860068663433135,
            "baseline": 0.8019962912936975,
            "edge": -0.015989424950384024,
            "samples": 1187,
            "hits": 933,
            "lineRate": 0.7855143838189718
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.9036468786686973,
            "baseline": 0.9118930865565257,
            "edge": -0.008246207887828372,
            "samples": 1183,
            "hits": 1069,
            "lineRate": 0.9043597519221445
          }
        },
        "reason": "长期新三期窗口 90.4%（1312/1451），第1/2/3期结束 62/25/13%，当前上一期开出状态。综合：一期56.0% / 两期78.6% / 三期90.4%，本线权重 1/1/99%。"
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
          "brier": 0.08508789433661396,
          "baselineBrier": 0.07883755317389056,
          "brierSkill": -0.07928126776001188
        },
        {
          "year": 2026,
          "predictions": 296,
          "hits": 265,
          "rate": 0.8952702702702703,
          "baseline": 0.8515905895932288,
          "brier": 0.09649805983828139,
          "baselineBrier": 0.09599562915087342,
          "brierSkill": -0.005233891291220205
        }
      ],
      "weights": {
        "one": 0.005005631684790066,
        "two": 0.005005631684790066,
        "three": 0.9899887366304199,
        "skills": {
          "one": -0.838004244750308,
          "two": -0.1232640071513762,
          "three": -0.0006930507444142808
        }
      },
      "current": {
        "target": 1464,
        "tail": 0,
        "state": "after_hit",
        "stateLabel": "上一期开出",
        "samples": 687,
        "hits": 595,
        "lineRate": 0.8383930977761314,
        "predictedRate": 0.8628386207208817,
        "baseline": 0.8553392602150206,
        "edge": 0.007499360505861086,
        "lower": 0.8485790788760227,
        "upper": 0.8818478040860659,
        "confidence": "接近基准",
        "submodels": {
          "one": {
            "cap": 1,
            "predictedRate": 0.48525424900350983,
            "baseline": 0.4750512645249487,
            "edge": 0.010202984478561106,
            "samples": 692,
            "hits": 336,
            "lineRate": 0.4750512645249488
          },
          "two": {
            "cap": 2,
            "predictedRate": 0.7534105916958973,
            "baseline": 0.7244288251231447,
            "edge": 0.028981766572752643,
            "samples": 688,
            "hits": 519,
            "lineRate": 0.7207349460347641
          },
          "three": {
            "cap": 3,
            "predictedRate": 0.8653010777305837,
            "baseline": 0.8553392602150206,
            "edge": 0.009961817515563132,
            "samples": 687,
            "hits": 595,
            "lineRate": 0.8383930977761314
          }
        },
        "reason": "长期新三期窗口 83.8%（1216/1451），第1/2/3期结束 57/29/14%，当前上一期开出状态。综合：一期48.5% / 两期75.3% / 三期86.5%，本线权重 1/1/99%。"
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
        "hits": 409,
        "rate": 0.8852813852813853
      },
      "top3": {
        "n": 693,
        "hits": 622,
        "rate": 0.8975468975468975
      },
      "top2Lift": -0.0248085248085248,
      "top3Lift": -0.0125430125430126
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
        "hits": 529,
        "rate": 0.893581081081081
      },
      "top3": {
        "n": 888,
        "hits": 796,
        "rate": 0.8963963963963963
      },
      "top2Lift": -0.009225571725571813,
      "top3Lift": -0.0064102564102564985
    }
  ]
};
