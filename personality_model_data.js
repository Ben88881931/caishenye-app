window.APP_PERSONALITY_MODEL = {
  "version": "personality-v1-20261025",
  "method": "per-line-long-term-personality-v1",
  "generatedAt": "2026-10-25T16:03:39.242Z",
  "asOfPeriod": 1463,
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
  "lines": [
    {
      "id": "tail0",
      "label": "尾0",
      "kind": "tail",
      "longTerm": {
        "windows": 696,
        "hits": 604,
        "misses": 92,
        "rate": 0.867816091954023,
        "baseline": 0.8252645080511333,
        "edge": 0.04255158390288971,
        "stageShare": {
          "first": 0.5579470198675497,
          "second": 0.30960264900662254,
          "third": 0.13245033112582782
        },
        "stageCounts": {
          "first": 337,
          "second": 187,
          "third": 80
        },
        "hitRuns": {
          "1": 75,
          "2": 68,
          "3": 56,
          "4": 405
        },
        "missRuns": {
          "1": 74,
          "2": 14,
          "3": 3,
          "4": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 601,
            "hits": 527
          },
          "after_one_miss": {
            "windows": 73,
            "hits": 59
          },
          "after_two_misses": {
            "windows": 12,
            "hits": 9
          },
          "after_three_plus_misses": {
            "windows": 4,
            "hits": 3
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 99,
          "hits": 83,
          "rate": 0.8383838383838383
        },
        {
          "year": 2022,
          "windows": 96,
          "hits": 74,
          "rate": 0.7708333333333334
        },
        {
          "year": 2023,
          "windows": 105,
          "hits": 87,
          "rate": 0.8285714285714286
        },
        {
          "year": 2024,
          "windows": 118,
          "hits": 106,
          "rate": 0.8983050847457628
        },
        {
          "year": 2025,
          "windows": 123,
          "hits": 112,
          "rate": 0.9105691056910569
        },
        {
          "year": 2026,
          "windows": 155,
          "hits": 142,
          "rate": 0.9161290322580645
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 123,
          "hits": 112,
          "rate": 0.9105691056910569,
          "baseline": 0.8417500016096142,
          "brier": 0.0853614298009695,
          "baselineBrier": 0.0869314765023921,
          "brierSkill": 0.018060738924403186,
          "logLoss": 0.31816149866247784,
          "baselineLogLoss": 0.3245619313413587
        },
        {
          "year": 2026,
          "predictions": 155,
          "hits": 142,
          "rate": 0.9161290322580645,
          "baseline": 0.851668619026523,
          "brier": 0.07986285383679054,
          "baselineBrier": 0.0811823997697322,
          "brierSkill": 0.016254088776439857,
          "logLoss": 0.3020148999598204,
          "baselineLogLoss": 0.30788491761392994
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 0,
        "waitingTail": null,
        "samples": 601,
        "hits": 527,
        "lineRate": 0.8660577620406805,
        "predictedRate": 0.8765235994216,
        "baseline": 0.8252645080511333,
        "edge": 0.05125909137046669,
        "lower": 0.8586838671305267,
        "upper": 0.8930106813748458,
        "confidence": "高于基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 86.8%（604/696），第1/2/3期结束 56/31/13%，当前状态“上一窗命中”历史 527/601。"
      }
    },
    {
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 806,
        "hits": 743,
        "misses": 63,
        "rate": 0.9218362282878412,
        "baseline": 0.9121253645804503,
        "edge": 0.009710863707390827,
        "stageShare": {
          "first": 0.5921938088829072,
          "second": 0.2772543741588156,
          "third": 0.13055181695827725
        },
        "stageCounts": {
          "first": 440,
          "second": 206,
          "third": 97
        },
        "hitRuns": {
          "1": 61,
          "2": 54,
          "3": 51,
          "4": 577
        },
        "missRuns": {
          "1": 60,
          "2": 3
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 738,
            "hits": 678
          },
          "after_one_miss": {
            "windows": 60,
            "hits": 57
          },
          "after_two_misses": {
            "windows": 2,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 133,
          "hits": 121,
          "rate": 0.9097744360902256
        },
        {
          "year": 2022,
          "windows": 124,
          "hits": 113,
          "rate": 0.9112903225806451
        },
        {
          "year": 2023,
          "windows": 138,
          "hits": 129,
          "rate": 0.9347826086956522
        },
        {
          "year": 2024,
          "windows": 123,
          "hits": 112,
          "rate": 0.9105691056910569
        },
        {
          "year": 2025,
          "windows": 122,
          "hits": 114,
          "rate": 0.9344262295081968
        },
        {
          "year": 2026,
          "windows": 166,
          "hits": 154,
          "rate": 0.927710843373494
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 122,
          "hits": 114,
          "rate": 0.9344262295081968,
          "baseline": 0.9089884717957136,
          "brier": 0.061586383077313185,
          "baselineBrier": 0.061989622275097064,
          "brierSkill": 0.00650494684407632,
          "logLoss": 0.24417754658614582,
          "baselineLogLoss": 0.2467407709412592
        },
        {
          "year": 2026,
          "predictions": 166,
          "hits": 154,
          "rate": 0.927710843373494,
          "baseline": 0.9101579578352639,
          "brier": 0.06704137883972987,
          "baselineBrier": 0.06737077620098254,
          "brierSkill": 0.004889321154175286,
          "logLoss": 0.2592211526865499,
          "baselineLogLoss": 0.2615168651059419
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 1,
        "waitingTail": null,
        "samples": 738,
        "hits": 678,
        "lineRate": 0.9214877523174803,
        "predictedRate": 0.9187727639133899,
        "baseline": 0.9121253645804503,
        "edge": 0.006647399332939563,
        "lower": 0.904875550878989,
        "upper": 0.93066787142034,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 92.2%（743/806），第1/2/3期结束 59/28/13%，当前状态“上一窗命中”历史 678/738。"
      }
    },
    {
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 848,
        "hits": 778,
        "misses": 70,
        "rate": 0.9174528301886793,
        "baseline": 0.9391595451149473,
        "edge": -0.021706714926267967,
        "stageShare": {
          "first": 0.6529562982005142,
          "second": 0.2416452442159383,
          "third": 0.10539845758354756
        },
        "stageCounts": {
          "first": 508,
          "second": 188,
          "third": 82
        },
        "hitRuns": {
          "1": 66,
          "2": 61,
          "3": 55,
          "4": 596
        },
        "missRuns": {
          "1": 66,
          "2": 4
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 773,
            "hits": 707
          },
          "after_one_miss": {
            "windows": 65,
            "hits": 61
          },
          "after_two_misses": {
            "windows": 4,
            "hits": 4
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 141,
          "hits": 131,
          "rate": 0.9290780141843972
        },
        {
          "year": 2022,
          "windows": 143,
          "hits": 136,
          "rate": 0.951048951048951
        },
        {
          "year": 2023,
          "windows": 136,
          "hits": 125,
          "rate": 0.9191176470588235
        },
        {
          "year": 2024,
          "windows": 140,
          "hits": 132,
          "rate": 0.9428571428571428
        },
        {
          "year": 2025,
          "windows": 129,
          "hits": 115,
          "rate": 0.8914728682170543
        },
        {
          "year": 2026,
          "windows": 159,
          "hits": 139,
          "rate": 0.8742138364779874
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 129,
          "hits": 115,
          "rate": 0.8914728682170543,
          "baseline": 0.9342574246779254,
          "brier": 0.09864640052583896,
          "baselineBrier": 0.09871208120441453,
          "brierSkill": 0.0006653762920827422,
          "logLoss": 0.35634490984453115,
          "baselineLogLoss": 0.3571314132888073
        },
        {
          "year": 2026,
          "predictions": 159,
          "hits": 139,
          "rate": 0.8742138364779874,
          "baseline": 0.9286509918637921,
          "brier": 0.11218661038333617,
          "baselineBrier": 0.11305331177187004,
          "brierSkill": 0.007666306939179135,
          "logLoss": 0.39147210109397035,
          "baselineLogLoss": 0.39778114350729854
        }
      ],
      "current": {
        "state": "after_one_miss",
        "stateLabel": "上一窗全错1次",
        "status": "waiting",
        "lockedTail": 2,
        "waitingTail": 2,
        "samples": 65,
        "hits": 61,
        "lineRate": 0.9181945174868433,
        "predictedRate": 0.9336928276439631,
        "baseline": 0.9391595451149473,
        "edge": -0.00546671747098415,
        "lower": 0.8884880321061045,
        "upper": 0.9668746416675754,
        "confidence": "等待重开",
        "windowStart": null,
        "windowAttempts": 0,
        "reason": "长期 91.7%（778/848），第1/2/3期结束 65/24/11%，当前状态“上一窗全错1次”历史 61/65。"
      }
    },
    {
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 812,
        "hits": 747,
        "misses": 65,
        "rate": 0.9199507389162561,
        "baseline": 0.9159713472271525,
        "edge": 0.003979391689103662,
        "stageShare": {
          "first": 0.6117804551539491,
          "second": 0.2637215528781794,
          "third": 0.12449799196787148
        },
        "stageCounts": {
          "first": 457,
          "second": 197,
          "third": 93
        },
        "hitRuns": {
          "1": 61,
          "2": 57,
          "3": 56,
          "4": 573
        },
        "missRuns": {
          "1": 60,
          "2": 4,
          "3": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 741,
            "hits": 681
          },
          "after_one_miss": {
            "windows": 60,
            "hits": 56
          },
          "after_two_misses": {
            "windows": 4,
            "hits": 3
          },
          "after_three_plus_misses": {
            "windows": 1,
            "hits": 1
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 129,
          "hits": 118,
          "rate": 0.9147286821705426
        },
        {
          "year": 2022,
          "windows": 134,
          "hits": 124,
          "rate": 0.9253731343283582
        },
        {
          "year": 2023,
          "windows": 120,
          "hits": 111,
          "rate": 0.925
        },
        {
          "year": 2024,
          "windows": 139,
          "hits": 130,
          "rate": 0.935251798561151
        },
        {
          "year": 2025,
          "windows": 142,
          "hits": 133,
          "rate": 0.9366197183098591
        },
        {
          "year": 2026,
          "windows": 148,
          "hits": 131,
          "rate": 0.8851351351351351
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 142,
          "hits": 133,
          "rate": 0.9366197183098591,
          "baseline": 0.9191390623142818,
          "brier": 0.059757928932397425,
          "baselineBrier": 0.05974407397672953,
          "brierSkill": -0.0002319051036474562,
          "logLoss": 0.2392219575449622,
          "baselineLogLoss": 0.23887801224851452
        },
        {
          "year": 2026,
          "predictions": 148,
          "hits": 131,
          "rate": 0.8851351351351351,
          "baseline": 0.9158862452105304,
          "brier": 0.10337634613548599,
          "baselineBrier": 0.10270912980104191,
          "brierSkill": -0.006496173570319952,
          "logLoss": 0.36737285938866737,
          "baselineLogLoss": 0.36273698735996557
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 3,
        "waitingTail": null,
        "samples": 741,
        "hits": 681,
        "lineRate": 0.9198089553643878,
        "predictedRate": 0.9190488555943334,
        "baseline": 0.9159713472271525,
        "edge": 0.0030775083671809034,
        "lower": 0.9052575367386819,
        "upper": 0.9309502327491335,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 92.0%（747/812），第1/2/3期结束 61/26/12%，当前状态“上一窗命中”历史 681/741。"
      }
    },
    {
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 779,
        "hits": 707,
        "misses": 72,
        "rate": 0.9075738125802311,
        "baseline": 0.906104136074455,
        "edge": 0.0014696765057761185,
        "stageShare": {
          "first": 0.5898161244695899,
          "second": 0.26025459688826025,
          "third": 0.14992927864214992
        },
        "stageCounts": {
          "first": 417,
          "second": 184,
          "third": 106
        },
        "hitRuns": {
          "1": 68,
          "2": 61,
          "3": 57,
          "4": 521
        },
        "missRuns": {
          "1": 67,
          "2": 5
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 702,
            "hits": 635
          },
          "after_one_miss": {
            "windows": 66,
            "hits": 61
          },
          "after_two_misses": {
            "windows": 5,
            "hits": 5
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 126,
          "hits": 112,
          "rate": 0.8888888888888888
        },
        {
          "year": 2022,
          "windows": 137,
          "hits": 131,
          "rate": 0.9562043795620438
        },
        {
          "year": 2023,
          "windows": 122,
          "hits": 111,
          "rate": 0.9098360655737705
        },
        {
          "year": 2024,
          "windows": 120,
          "hits": 107,
          "rate": 0.8916666666666667
        },
        {
          "year": 2025,
          "windows": 113,
          "hits": 98,
          "rate": 0.8672566371681416
        },
        {
          "year": 2026,
          "windows": 161,
          "hits": 148,
          "rate": 0.9192546583850931
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 113,
          "hits": 98,
          "rate": 0.8672566371681416,
          "baseline": 0.9004328501429397,
          "brier": 0.11685378012735534,
          "baselineBrier": 0.11639761685953307,
          "brierSkill": -0.00391900865438477,
          "logLoss": 0.400904084466745,
          "baselineLogLoss": 0.3981721581666
        },
        {
          "year": 2026,
          "predictions": 161,
          "hits": 148,
          "rate": 0.9192546583850931,
          "baseline": 0.8967289525250441,
          "brier": 0.07461783796416595,
          "baselineBrier": 0.07483842100399214,
          "brierSkill": 0.00294745715993161,
          "logLoss": 0.2829903311900042,
          "baselineLogLoss": 0.2840937744613131
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 4,
        "waitingTail": null,
        "samples": 702,
        "hits": 635,
        "lineRate": 0.9075193128334161,
        "predictedRate": 0.9046404241782109,
        "baseline": 0.906104136074455,
        "edge": -0.0014637118962440576,
        "lower": 0.8894069031232135,
        "upper": 0.91782590281802,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 90.8%（707/779），第1/2/3期结束 59/26/15%，当前状态“上一窗命中”历史 635/702。"
      }
    },
    {
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 809,
        "hits": 739,
        "misses": 70,
        "rate": 0.9134734239802225,
        "baseline": 0.9123544168352413,
        "edge": 0.0011190071449811434,
        "stageShare": {
          "first": 0.6129905277401895,
          "second": 0.2557510148849797,
          "third": 0.13125845737483086
        },
        "stageCounts": {
          "first": 453,
          "second": 189,
          "third": 97
        },
        "hitRuns": {
          "1": 61,
          "2": 58,
          "3": 55,
          "4": 565
        },
        "missRuns": {
          "1": 60,
          "2": 7,
          "3": 2,
          "4": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 733,
            "hits": 673
          },
          "after_one_miss": {
            "windows": 60,
            "hits": 53
          },
          "after_two_misses": {
            "windows": 7,
            "hits": 5
          },
          "after_three_plus_misses": {
            "windows": 3,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 133,
          "hits": 121,
          "rate": 0.9097744360902256
        },
        {
          "year": 2022,
          "windows": 120,
          "hits": 109,
          "rate": 0.9083333333333333
        },
        {
          "year": 2023,
          "windows": 126,
          "hits": 116,
          "rate": 0.9206349206349206
        },
        {
          "year": 2024,
          "windows": 145,
          "hits": 134,
          "rate": 0.9241379310344827
        },
        {
          "year": 2025,
          "windows": 134,
          "hits": 125,
          "rate": 0.9328358208955224
        },
        {
          "year": 2026,
          "windows": 151,
          "hits": 134,
          "rate": 0.8874172185430463
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 134,
          "hits": 125,
          "rate": 0.9328358208955224,
          "baseline": 0.9161733198973884,
          "brier": 0.06330303509526376,
          "baselineBrier": 0.06297023567058806,
          "brierSkill": -0.0052850274599043345,
          "logLoss": 0.25090563649810227,
          "baselineLogLoss": 0.24842401210753579
        },
        {
          "year": 2026,
          "predictions": 151,
          "hits": 134,
          "rate": 0.8874172185430463,
          "baseline": 0.9133653581713106,
          "brier": 0.10101202470659004,
          "baselineBrier": 0.10059501695572678,
          "brierSkill": -0.004145411606688132,
          "logLoss": 0.3588943674259242,
          "baselineLogLoss": 0.3558806839312841
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 5,
        "waitingTail": null,
        "samples": 733,
        "hits": 673,
        "lineRate": 0.9134334118057893,
        "predictedRate": 0.9180194797292375,
        "baseline": 0.9123544168352413,
        "edge": 0.005665062893996153,
        "lower": 0.9042320178421858,
        "upper": 0.9301921015613194,
        "confidence": "接近基准",
        "windowStart": 1463,
        "windowAttempts": 1,
        "reason": "长期 91.3%（739/809），第1/2/3期结束 61/26/13%，当前状态“上一窗命中”历史 673/733。"
      }
    },
    {
      "id": "tail6",
      "label": "尾6",
      "kind": "tail",
      "longTerm": {
        "windows": 826,
        "hits": 763,
        "misses": 63,
        "rate": 0.923728813559322,
        "baseline": 0.9176399067400087,
        "edge": 0.006088906819313289,
        "stageShare": {
          "first": 0.6107470511140236,
          "second": 0.2503276539973788,
          "third": 0.13892529488859764
        },
        "stageCounts": {
          "first": 466,
          "second": 191,
          "third": 106
        },
        "hitRuns": {
          "1": 59,
          "2": 54,
          "3": 48,
          "4": 602
        },
        "missRuns": {
          "1": 58,
          "2": 5
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 5
          },
          "after_hit": {
            "windows": 758,
            "hits": 701
          },
          "after_one_miss": {
            "windows": 57,
            "hits": 52
          },
          "after_two_misses": {
            "windows": 5,
            "hits": 5
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 131,
          "hits": 122,
          "rate": 0.9312977099236641
        },
        {
          "year": 2022,
          "windows": 137,
          "hits": 129,
          "rate": 0.9416058394160584
        },
        {
          "year": 2023,
          "windows": 130,
          "hits": 119,
          "rate": 0.9153846153846154
        },
        {
          "year": 2024,
          "windows": 131,
          "hits": 119,
          "rate": 0.9083969465648855
        },
        {
          "year": 2025,
          "windows": 117,
          "hits": 106,
          "rate": 0.905982905982906
        },
        {
          "year": 2026,
          "windows": 180,
          "hits": 168,
          "rate": 0.9333333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 117,
          "hits": 106,
          "rate": 0.905982905982906,
          "baseline": 0.9141986286585667,
          "brier": 0.08627096053862214,
          "baselineBrier": 0.0853987115050674,
          "brierSkill": -0.010213843021542157,
          "logLoss": 0.32065745748230307,
          "baselineLogLoss": 0.3131173124281605
        },
        {
          "year": 2026,
          "predictions": 180,
          "hits": 168,
          "rate": 0.9333333333333333,
          "baseline": 0.9138397385445555,
          "brier": 0.06270472325159505,
          "baselineBrier": 0.06273883600361647,
          "brierSkill": 0.0005437262498694251,
          "logLoss": 0.24853149529812668,
          "baselineLogLoss": 0.24839628290195018
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 6,
        "waitingTail": null,
        "samples": 758,
        "hits": 701,
        "lineRate": 0.92351541729229,
        "predictedRate": 0.9247690338635549,
        "baseline": 0.9176399067400087,
        "edge": 0.007129127123546186,
        "lower": 0.9116045535057661,
        "upper": 0.9361672284368002,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 92.4%（763/826），第1/2/3期结束 61/25/14%，当前状态“上一窗命中”历史 701/758。"
      }
    },
    {
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 807,
        "hits": 740,
        "misses": 67,
        "rate": 0.9169764560099133,
        "baseline": 0.9147892623228175,
        "edge": 0.0021871936870957454,
        "stageShare": {
          "first": 0.6,
          "second": 0.26216216216216215,
          "third": 0.13783783783783785
        },
        "stageCounts": {
          "first": 444,
          "second": 194,
          "third": 102
        },
        "hitRuns": {
          "1": 64,
          "2": 56,
          "3": 53,
          "4": 567
        },
        "missRuns": {
          "1": 63,
          "2": 4
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 5
          },
          "after_hit": {
            "windows": 736,
            "hits": 674
          },
          "after_one_miss": {
            "windows": 61,
            "hits": 57
          },
          "after_two_misses": {
            "windows": 4,
            "hits": 4
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 140,
          "hits": 134,
          "rate": 0.9571428571428572
        },
        {
          "year": 2022,
          "windows": 123,
          "hits": 113,
          "rate": 0.9186991869918699
        },
        {
          "year": 2023,
          "windows": 130,
          "hits": 117,
          "rate": 0.9
        },
        {
          "year": 2024,
          "windows": 119,
          "hits": 108,
          "rate": 0.907563025210084
        },
        {
          "year": 2025,
          "windows": 126,
          "hits": 113,
          "rate": 0.8968253968253969
        },
        {
          "year": 2026,
          "windows": 169,
          "hits": 155,
          "rate": 0.9171597633136095
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 126,
          "hits": 113,
          "rate": 0.8968253968253969,
          "baseline": 0.9077100396628711,
          "brier": 0.0931764151749414,
          "baselineBrier": 0.09278985032992174,
          "brierSkill": -0.004166025094826553,
          "logLoss": 0.3360668392717886,
          "baselineLogLoss": 0.3335336314102712
        },
        {
          "year": 2026,
          "predictions": 169,
          "hits": 155,
          "rate": 0.9171597633136095,
          "baseline": 0.9092023965103547,
          "brier": 0.07617426908350876,
          "baselineBrier": 0.07614452244839788,
          "brierSkill": -0.00039066020974831694,
          "logLoss": 0.2870543023815295,
          "baselineLogLoss": 0.28667727359194184
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 7,
        "waitingTail": null,
        "samples": 736,
        "hits": 674,
        "lineRate": 0.9168980619709493,
        "predictedRate": 0.9157909540203955,
        "baseline": 0.9147892623228175,
        "edge": 0.001001691697577911,
        "lower": 0.9017149758388526,
        "upper": 0.9279598350169812,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 91.7%（740/807），第1/2/3期结束 60/26/14%，当前状态“上一窗命中”历史 674/736。"
      }
    },
    {
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 799,
        "hits": 724,
        "misses": 75,
        "rate": 0.9061326658322904,
        "baseline": 0.8963078059223887,
        "edge": 0.009824859909901673,
        "stageShare": {
          "first": 0.6146408839779005,
          "second": 0.27348066298342544,
          "third": 0.11187845303867404
        },
        "stageCounts": {
          "first": 445,
          "second": 198,
          "third": 81
        },
        "hitRuns": {
          "1": 65,
          "2": 59,
          "3": 55,
          "4": 545
        },
        "missRuns": {
          "1": 65,
          "2": 9,
          "3": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 4
          },
          "after_one_miss": {
            "windows": 65,
            "hits": 57
          },
          "after_two_misses": {
            "windows": 8,
            "hits": 7
          },
          "after_hit": {
            "windows": 719,
            "hits": 655
          },
          "after_three_plus_misses": {
            "windows": 1,
            "hits": 1
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 122,
          "hits": 110,
          "rate": 0.9016393442622951
        },
        {
          "year": 2022,
          "windows": 133,
          "hits": 121,
          "rate": 0.9097744360902256
        },
        {
          "year": 2023,
          "windows": 128,
          "hits": 117,
          "rate": 0.9140625
        },
        {
          "year": 2024,
          "windows": 115,
          "hits": 100,
          "rate": 0.8695652173913043
        },
        {
          "year": 2025,
          "windows": 133,
          "hits": 125,
          "rate": 0.9398496240601504
        },
        {
          "year": 2026,
          "windows": 168,
          "hits": 151,
          "rate": 0.8988095238095238
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 133,
          "hits": 125,
          "rate": 0.9398496240601504,
          "baseline": 0.9014706302007506,
          "brier": 0.057817649524212464,
          "baselineBrier": 0.05806525475336098,
          "brierSkill": 0.004264258035209689,
          "logLoss": 0.23554914489296752,
          "baselineLogLoss": 0.23721553624864292
        },
        {
          "year": 2026,
          "predictions": 168,
          "hits": 151,
          "rate": 0.8988095238095238,
          "baseline": 0.9054485298240221,
          "brier": 0.09149095536351186,
          "baselineBrier": 0.09111877116447074,
          "brierSkill": -0.00408460511796549,
          "logLoss": 0.33098032207546174,
          "baselineLogLoss": 0.32866700689597633
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 8,
        "waitingTail": null,
        "samples": 719,
        "hits": 655,
        "lineRate": 0.9057771220478549,
        "predictedRate": 0.910846471503325,
        "baseline": 0.8963078059223887,
        "edge": 0.014538665580936305,
        "lower": 0.8964430600581536,
        "upper": 0.9236631124688727,
        "confidence": "高于基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 90.6%（724/799），第1/2/3期结束 61/27/11%，当前状态“上一窗命中”历史 655/719。"
      }
    },
    {
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 826,
        "hits": 744,
        "misses": 82,
        "rate": 0.9007263922518159,
        "baseline": 0.9082880076373938,
        "edge": -0.007561615385577869,
        "stageShare": {
          "first": 0.6411290322580645,
          "second": 0.26344086021505375,
          "third": 0.09543010752688172
        },
        "stageCounts": {
          "first": 477,
          "second": 196,
          "third": 71
        },
        "hitRuns": {
          "1": 76,
          "2": 65,
          "3": 64,
          "4": 539
        },
        "missRuns": {
          "1": 75,
          "2": 6,
          "3": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 739,
            "hits": 664
          },
          "after_one_miss": {
            "windows": 74,
            "hits": 68
          },
          "after_two_misses": {
            "windows": 6,
            "hits": 5
          },
          "after_three_plus_misses": {
            "windows": 1,
            "hits": 1
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 127,
          "hits": 111,
          "rate": 0.8740157480314961
        },
        {
          "year": 2022,
          "windows": 132,
          "hits": 116,
          "rate": 0.8787878787878788
        },
        {
          "year": 2023,
          "windows": 132,
          "hits": 119,
          "rate": 0.9015151515151515
        },
        {
          "year": 2024,
          "windows": 130,
          "hits": 117,
          "rate": 0.9
        },
        {
          "year": 2025,
          "windows": 127,
          "hits": 116,
          "rate": 0.9133858267716536
        },
        {
          "year": 2026,
          "windows": 178,
          "hits": 165,
          "rate": 0.9269662921348315
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 127,
          "hits": 116,
          "rate": 0.9133858267716536,
          "baseline": 0.9114966196971541,
          "brier": 0.07990767459553005,
          "baselineBrier": 0.07921680456666524,
          "brierSkill": -0.008721255958808571,
          "logLoss": 0.2988661056713522,
          "baselineLogLoss": 0.29528283012279144
        },
        {
          "year": 2026,
          "predictions": 178,
          "hits": 165,
          "rate": 0.9269662921348315,
          "baseline": 0.9137744767860592,
          "brier": 0.06860226352757531,
          "baselineBrier": 0.06791347883719412,
          "brierSkill": -0.010142091116144725,
          "logLoss": 0.2667250535564847,
          "baselineLogLoss": 0.2628215196339037
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 9,
        "waitingTail": null,
        "samples": 739,
        "hits": 664,
        "lineRate": 0.9009914021368246,
        "predictedRate": 0.8985768485411547,
        "baseline": 0.9082880076373938,
        "edge": -0.009711159096239097,
        "lower": 0.8833997017496331,
        "upper": 0.9118601713544348,
        "confidence": "接近基准",
        "windowStart": 1463,
        "windowAttempts": 1,
        "reason": "长期 90.1%（744/826），第1/2/3期结束 64/26/10%，当前状态“上一窗命中”历史 664/739。"
      }
    },
    {
      "id": "prob1",
      "label": "概率第1",
      "kind": "probability",
      "longTerm": {
        "windows": 826,
        "hits": 755,
        "misses": 71,
        "rate": 0.914043583535109,
        "baseline": 0.9060180336627223,
        "edge": 0.008025549872386684,
        "stageShare": {
          "first": 0.6211920529801325,
          "second": 0.26225165562913905,
          "third": 0.11655629139072848
        },
        "stageCounts": {
          "first": 469,
          "second": 198,
          "third": 88
        },
        "hitRuns": {
          "1": 64,
          "2": 60,
          "3": 53,
          "4": 578
        },
        "missRuns": {
          "1": 63,
          "2": 6,
          "3": 2
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 750,
            "hits": 687
          },
          "after_one_miss": {
            "windows": 62,
            "hits": 56
          },
          "after_two_misses": {
            "windows": 6,
            "hits": 4
          },
          "after_three_plus_misses": {
            "windows": 2,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 139,
          "hits": 129,
          "rate": 0.9280575539568345
        },
        {
          "year": 2022,
          "windows": 118,
          "hits": 102,
          "rate": 0.864406779661017
        },
        {
          "year": 2023,
          "windows": 134,
          "hits": 123,
          "rate": 0.917910447761194
        },
        {
          "year": 2024,
          "windows": 135,
          "hits": 127,
          "rate": 0.9407407407407408
        },
        {
          "year": 2025,
          "windows": 128,
          "hits": 116,
          "rate": 0.90625
        },
        {
          "year": 2026,
          "windows": 172,
          "hits": 158,
          "rate": 0.9186046511627907
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 128,
          "hits": 116,
          "rate": 0.90625,
          "baseline": 0.9102122232198078,
          "brier": 0.08543966843092761,
          "baselineBrier": 0.08525958796255123,
          "brierSkill": -0.002112143310561976,
          "logLoss": 0.31388911137581565,
          "baselineLogLoss": 0.31151838711345037
        },
        {
          "year": 2026,
          "predictions": 172,
          "hits": 158,
          "rate": 0.9186046511627907,
          "baseline": 0.9064915048113972,
          "brier": 0.07505756562386796,
          "baselineBrier": 0.07544166658337674,
          "brierSkill": 0.005091363657565462,
          "logLoss": 0.28381404311846964,
          "baselineLogLoss": 0.2862926760449192
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 3,
        "waitingTail": null,
        "samples": 750,
        "hits": 687,
        "lineRate": 0.9137623142638805,
        "predictedRate": 0.9159418782925683,
        "baseline": 0.9060180336627223,
        "edge": 0.00992384462984608,
        "lower": 0.9021108192204379,
        "upper": 0.928075610850192,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 91.4%（755/826），第1/2/3期结束 62/26/12%，当前状态“上一窗命中”历史 687/750。"
      }
    },
    {
      "id": "prob2",
      "label": "概率第2",
      "kind": "probability",
      "longTerm": {
        "windows": 809,
        "hits": 734,
        "misses": 75,
        "rate": 0.907292954264524,
        "baseline": 0.9073192517967172,
        "edge": -0.000026297532193186868,
        "stageShare": {
          "first": 0.6171662125340599,
          "second": 0.2561307901907357,
          "third": 0.12670299727520437
        },
        "stageCounts": {
          "first": 453,
          "second": 188,
          "third": 93
        },
        "hitRuns": {
          "1": 68,
          "2": 63,
          "3": 60,
          "4": 543
        },
        "missRuns": {
          "1": 67,
          "2": 5,
          "3": 2,
          "4": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 728,
            "hits": 661
          },
          "after_one_miss": {
            "windows": 67,
            "hits": 62
          },
          "after_two_misses": {
            "windows": 5,
            "hits": 3
          },
          "after_three_plus_misses": {
            "windows": 3,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 146,
          "hits": 136,
          "rate": 0.9315068493150684
        },
        {
          "year": 2022,
          "windows": 132,
          "hits": 121,
          "rate": 0.9166666666666666
        },
        {
          "year": 2023,
          "windows": 112,
          "hits": 98,
          "rate": 0.875
        },
        {
          "year": 2024,
          "windows": 124,
          "hits": 111,
          "rate": 0.8951612903225806
        },
        {
          "year": 2025,
          "windows": 135,
          "hits": 125,
          "rate": 0.9259259259259259
        },
        {
          "year": 2026,
          "windows": 160,
          "hits": 143,
          "rate": 0.89375
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 135,
          "hits": 125,
          "rate": 0.9259259259259259,
          "baseline": 0.9052640605820418,
          "brier": 0.0687704980568552,
          "baselineBrier": 0.07082162299906035,
          "brierSkill": 0.02896184604852059,
          "logLoss": 0.26510664723892796,
          "baselineLogLoss": 0.27568453305486407
        },
        {
          "year": 2026,
          "predictions": 160,
          "hits": 143,
          "rate": 0.89375,
          "baseline": 0.9096350268864002,
          "brier": 0.09541069998947649,
          "baselineBrier": 0.09431996329256401,
          "brierSkill": -0.01156421884441583,
          "logLoss": 0.3417437850055641,
          "baselineLogLoss": 0.335642536181434
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 0,
        "waitingTail": null,
        "samples": 728,
        "hits": 661,
        "lineRate": 0.9072938945815275,
        "predictedRate": 0.9079490346144794,
        "baseline": 0.9073192517967172,
        "edge": 0.0006297828177621589,
        "lower": 0.8933221660444595,
        "upper": 0.9207797233297841,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 90.7%（734/809），第1/2/3期结束 62/26/13%，当前状态“上一窗命中”历史 661/728。"
      }
    },
    {
      "id": "prob3",
      "label": "概率第3",
      "kind": "probability",
      "longTerm": {
        "windows": 798,
        "hits": 729,
        "misses": 69,
        "rate": 0.9135338345864662,
        "baseline": 0.9064070464176452,
        "edge": 0.007126788168820952,
        "stageShare": {
          "first": 0.5898491083676269,
          "second": 0.27983539094650206,
          "third": 0.13031550068587106
        },
        "stageCounts": {
          "first": 430,
          "second": 204,
          "third": 95
        },
        "hitRuns": {
          "1": 66,
          "2": 62,
          "3": 54,
          "4": 547
        },
        "missRuns": {
          "1": 66,
          "2": 3
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 726,
            "hits": 660
          },
          "after_one_miss": {
            "windows": 63,
            "hits": 60
          },
          "after_two_misses": {
            "windows": 3,
            "hits": 3
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 125,
          "hits": 115,
          "rate": 0.92
        },
        {
          "year": 2022,
          "windows": 130,
          "hits": 118,
          "rate": 0.9076923076923077
        },
        {
          "year": 2023,
          "windows": 128,
          "hits": 116,
          "rate": 0.90625
        },
        {
          "year": 2024,
          "windows": 129,
          "hits": 121,
          "rate": 0.937984496124031
        },
        {
          "year": 2025,
          "windows": 117,
          "hits": 102,
          "rate": 0.8717948717948718
        },
        {
          "year": 2026,
          "windows": 169,
          "hits": 157,
          "rate": 0.9289940828402367
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 117,
          "hits": 102,
          "rate": 0.8717948717948718,
          "baseline": 0.902163318123065,
          "brier": 0.11230418293240468,
          "baselineBrier": 0.11304964989871528,
          "brierSkill": 0.006594155461591367,
          "logLoss": 0.38365921226819744,
          "baselineLogLoss": 0.39067610259945595
        },
        {
          "year": 2026,
          "predictions": 169,
          "hits": 157,
          "rate": 0.9289940828402367,
          "baseline": 0.9077554082287547,
          "brier": 0.06743250810307871,
          "baselineBrier": 0.06754550030287558,
          "brierSkill": 0.0016728308960657357,
          "logLoss": 0.2676022316523151,
          "baselineLogLoss": 0.2657316441828394
        }
      ],
      "current": {
        "state": "after_one_miss",
        "stateLabel": "上一窗全错1次",
        "status": "waiting",
        "lockedTail": null,
        "waitingTail": 2,
        "samples": 63,
        "hits": 60,
        "lineRate": 0.9132756176238277,
        "predictedRate": 0.9429579801503198,
        "baseline": 0.9064070464176452,
        "edge": 0.036550933732674595,
        "lower": 0.905123130660311,
        "upper": 0.9767056274772666,
        "confidence": "等待重开",
        "windowStart": null,
        "windowAttempts": 0,
        "reason": "长期 91.4%（729/798），第1/2/3期结束 59/28/13%，当前状态“上一窗全错1次”历史 60/63。"
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
        "windows": 798,
        "hits": 729,
        "misses": 69,
        "rate": 0.9135338345864662,
        "baseline": 0.9064070464176452,
        "edge": 0.007126788168820952,
        "stageShare": {
          "first": 0.5898491083676269,
          "second": 0.27983539094650206,
          "third": 0.13031550068587106
        },
        "stageCounts": {
          "first": 430,
          "second": 204,
          "third": 95
        },
        "hitRuns": {
          "1": 66,
          "2": 62,
          "3": 54,
          "4": 547
        },
        "missRuns": {
          "1": 66,
          "2": 3
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 726,
            "hits": 660
          },
          "after_one_miss": {
            "windows": 63,
            "hits": 60
          },
          "after_two_misses": {
            "windows": 3,
            "hits": 3
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 125,
          "hits": 115,
          "rate": 0.92
        },
        {
          "year": 2022,
          "windows": 130,
          "hits": 118,
          "rate": 0.9076923076923077
        },
        {
          "year": 2023,
          "windows": 128,
          "hits": 116,
          "rate": 0.90625
        },
        {
          "year": 2024,
          "windows": 129,
          "hits": 121,
          "rate": 0.937984496124031
        },
        {
          "year": 2025,
          "windows": 117,
          "hits": 102,
          "rate": 0.8717948717948718
        },
        {
          "year": 2026,
          "windows": 169,
          "hits": 157,
          "rate": 0.9289940828402367
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 117,
          "hits": 102,
          "rate": 0.8717948717948718,
          "baseline": 0.902163318123065,
          "brier": 0.11230418293240468,
          "baselineBrier": 0.11304964989871528,
          "brierSkill": 0.006594155461591367,
          "logLoss": 0.38365921226819744,
          "baselineLogLoss": 0.39067610259945595
        },
        {
          "year": 2026,
          "predictions": 169,
          "hits": 157,
          "rate": 0.9289940828402367,
          "baseline": 0.9077554082287547,
          "brier": 0.06743250810307871,
          "baselineBrier": 0.06754550030287558,
          "brierSkill": 0.0016728308960657357,
          "logLoss": 0.2676022316523151,
          "baselineLogLoss": 0.2657316441828394
        }
      ],
      "current": {
        "state": "after_one_miss",
        "stateLabel": "上一窗全错1次",
        "status": "waiting",
        "lockedTail": null,
        "waitingTail": 2,
        "samples": 63,
        "hits": 60,
        "lineRate": 0.9132756176238277,
        "predictedRate": 0.9429579801503198,
        "baseline": 0.9064070464176452,
        "edge": 0.036550933732674595,
        "lower": 0.905123130660311,
        "upper": 0.9767056274772666,
        "confidence": "等待重开",
        "windowStart": null,
        "windowAttempts": 0,
        "reason": "长期 91.4%（729/798），第1/2/3期结束 59/28/13%，当前状态“上一窗全错1次”历史 60/63。"
      }
    },
    {
      "rank": 2,
      "id": "tail2",
      "label": "尾2",
      "kind": "tail",
      "longTerm": {
        "windows": 848,
        "hits": 778,
        "misses": 70,
        "rate": 0.9174528301886793,
        "baseline": 0.9391595451149473,
        "edge": -0.021706714926267967,
        "stageShare": {
          "first": 0.6529562982005142,
          "second": 0.2416452442159383,
          "third": 0.10539845758354756
        },
        "stageCounts": {
          "first": 508,
          "second": 188,
          "third": 82
        },
        "hitRuns": {
          "1": 66,
          "2": 61,
          "3": 55,
          "4": 596
        },
        "missRuns": {
          "1": 66,
          "2": 4
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 773,
            "hits": 707
          },
          "after_one_miss": {
            "windows": 65,
            "hits": 61
          },
          "after_two_misses": {
            "windows": 4,
            "hits": 4
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 141,
          "hits": 131,
          "rate": 0.9290780141843972
        },
        {
          "year": 2022,
          "windows": 143,
          "hits": 136,
          "rate": 0.951048951048951
        },
        {
          "year": 2023,
          "windows": 136,
          "hits": 125,
          "rate": 0.9191176470588235
        },
        {
          "year": 2024,
          "windows": 140,
          "hits": 132,
          "rate": 0.9428571428571428
        },
        {
          "year": 2025,
          "windows": 129,
          "hits": 115,
          "rate": 0.8914728682170543
        },
        {
          "year": 2026,
          "windows": 159,
          "hits": 139,
          "rate": 0.8742138364779874
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 129,
          "hits": 115,
          "rate": 0.8914728682170543,
          "baseline": 0.9342574246779254,
          "brier": 0.09864640052583896,
          "baselineBrier": 0.09871208120441453,
          "brierSkill": 0.0006653762920827422,
          "logLoss": 0.35634490984453115,
          "baselineLogLoss": 0.3571314132888073
        },
        {
          "year": 2026,
          "predictions": 159,
          "hits": 139,
          "rate": 0.8742138364779874,
          "baseline": 0.9286509918637921,
          "brier": 0.11218661038333617,
          "baselineBrier": 0.11305331177187004,
          "brierSkill": 0.007666306939179135,
          "logLoss": 0.39147210109397035,
          "baselineLogLoss": 0.39778114350729854
        }
      ],
      "current": {
        "state": "after_one_miss",
        "stateLabel": "上一窗全错1次",
        "status": "waiting",
        "lockedTail": 2,
        "waitingTail": 2,
        "samples": 65,
        "hits": 61,
        "lineRate": 0.9181945174868433,
        "predictedRate": 0.9336928276439631,
        "baseline": 0.9391595451149473,
        "edge": -0.00546671747098415,
        "lower": 0.8884880321061045,
        "upper": 0.9668746416675754,
        "confidence": "等待重开",
        "windowStart": null,
        "windowAttempts": 0,
        "reason": "长期 91.7%（778/848），第1/2/3期结束 65/24/11%，当前状态“上一窗全错1次”历史 61/65。"
      }
    },
    {
      "rank": 3,
      "id": "tail6",
      "label": "尾6",
      "kind": "tail",
      "longTerm": {
        "windows": 826,
        "hits": 763,
        "misses": 63,
        "rate": 0.923728813559322,
        "baseline": 0.9176399067400087,
        "edge": 0.006088906819313289,
        "stageShare": {
          "first": 0.6107470511140236,
          "second": 0.2503276539973788,
          "third": 0.13892529488859764
        },
        "stageCounts": {
          "first": 466,
          "second": 191,
          "third": 106
        },
        "hitRuns": {
          "1": 59,
          "2": 54,
          "3": 48,
          "4": 602
        },
        "missRuns": {
          "1": 58,
          "2": 5
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 5
          },
          "after_hit": {
            "windows": 758,
            "hits": 701
          },
          "after_one_miss": {
            "windows": 57,
            "hits": 52
          },
          "after_two_misses": {
            "windows": 5,
            "hits": 5
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 131,
          "hits": 122,
          "rate": 0.9312977099236641
        },
        {
          "year": 2022,
          "windows": 137,
          "hits": 129,
          "rate": 0.9416058394160584
        },
        {
          "year": 2023,
          "windows": 130,
          "hits": 119,
          "rate": 0.9153846153846154
        },
        {
          "year": 2024,
          "windows": 131,
          "hits": 119,
          "rate": 0.9083969465648855
        },
        {
          "year": 2025,
          "windows": 117,
          "hits": 106,
          "rate": 0.905982905982906
        },
        {
          "year": 2026,
          "windows": 180,
          "hits": 168,
          "rate": 0.9333333333333333
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 117,
          "hits": 106,
          "rate": 0.905982905982906,
          "baseline": 0.9141986286585667,
          "brier": 0.08627096053862214,
          "baselineBrier": 0.0853987115050674,
          "brierSkill": -0.010213843021542157,
          "logLoss": 0.32065745748230307,
          "baselineLogLoss": 0.3131173124281605
        },
        {
          "year": 2026,
          "predictions": 180,
          "hits": 168,
          "rate": 0.9333333333333333,
          "baseline": 0.9138397385445555,
          "brier": 0.06270472325159505,
          "baselineBrier": 0.06273883600361647,
          "brierSkill": 0.0005437262498694251,
          "logLoss": 0.24853149529812668,
          "baselineLogLoss": 0.24839628290195018
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 6,
        "waitingTail": null,
        "samples": 758,
        "hits": 701,
        "lineRate": 0.92351541729229,
        "predictedRate": 0.9247690338635549,
        "baseline": 0.9176399067400087,
        "edge": 0.007129127123546186,
        "lower": 0.9116045535057661,
        "upper": 0.9361672284368002,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 92.4%（763/826），第1/2/3期结束 61/25/14%，当前状态“上一窗命中”历史 701/758。"
      }
    },
    {
      "rank": 4,
      "id": "tail3",
      "label": "尾3",
      "kind": "tail",
      "longTerm": {
        "windows": 812,
        "hits": 747,
        "misses": 65,
        "rate": 0.9199507389162561,
        "baseline": 0.9159713472271525,
        "edge": 0.003979391689103662,
        "stageShare": {
          "first": 0.6117804551539491,
          "second": 0.2637215528781794,
          "third": 0.12449799196787148
        },
        "stageCounts": {
          "first": 457,
          "second": 197,
          "third": 93
        },
        "hitRuns": {
          "1": 61,
          "2": 57,
          "3": 56,
          "4": 573
        },
        "missRuns": {
          "1": 60,
          "2": 4,
          "3": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 741,
            "hits": 681
          },
          "after_one_miss": {
            "windows": 60,
            "hits": 56
          },
          "after_two_misses": {
            "windows": 4,
            "hits": 3
          },
          "after_three_plus_misses": {
            "windows": 1,
            "hits": 1
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 129,
          "hits": 118,
          "rate": 0.9147286821705426
        },
        {
          "year": 2022,
          "windows": 134,
          "hits": 124,
          "rate": 0.9253731343283582
        },
        {
          "year": 2023,
          "windows": 120,
          "hits": 111,
          "rate": 0.925
        },
        {
          "year": 2024,
          "windows": 139,
          "hits": 130,
          "rate": 0.935251798561151
        },
        {
          "year": 2025,
          "windows": 142,
          "hits": 133,
          "rate": 0.9366197183098591
        },
        {
          "year": 2026,
          "windows": 148,
          "hits": 131,
          "rate": 0.8851351351351351
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 142,
          "hits": 133,
          "rate": 0.9366197183098591,
          "baseline": 0.9191390623142818,
          "brier": 0.059757928932397425,
          "baselineBrier": 0.05974407397672953,
          "brierSkill": -0.0002319051036474562,
          "logLoss": 0.2392219575449622,
          "baselineLogLoss": 0.23887801224851452
        },
        {
          "year": 2026,
          "predictions": 148,
          "hits": 131,
          "rate": 0.8851351351351351,
          "baseline": 0.9158862452105304,
          "brier": 0.10337634613548599,
          "baselineBrier": 0.10270912980104191,
          "brierSkill": -0.006496173570319952,
          "logLoss": 0.36737285938866737,
          "baselineLogLoss": 0.36273698735996557
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 3,
        "waitingTail": null,
        "samples": 741,
        "hits": 681,
        "lineRate": 0.9198089553643878,
        "predictedRate": 0.9190488555943334,
        "baseline": 0.9159713472271525,
        "edge": 0.0030775083671809034,
        "lower": 0.9052575367386819,
        "upper": 0.9309502327491335,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 92.0%（747/812），第1/2/3期结束 61/26/12%，当前状态“上一窗命中”历史 681/741。"
      }
    },
    {
      "rank": 5,
      "id": "tail1",
      "label": "尾1",
      "kind": "tail",
      "longTerm": {
        "windows": 806,
        "hits": 743,
        "misses": 63,
        "rate": 0.9218362282878412,
        "baseline": 0.9121253645804503,
        "edge": 0.009710863707390827,
        "stageShare": {
          "first": 0.5921938088829072,
          "second": 0.2772543741588156,
          "third": 0.13055181695827725
        },
        "stageCounts": {
          "first": 440,
          "second": 206,
          "third": 97
        },
        "hitRuns": {
          "1": 61,
          "2": 54,
          "3": 51,
          "4": 577
        },
        "missRuns": {
          "1": 60,
          "2": 3
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 738,
            "hits": 678
          },
          "after_one_miss": {
            "windows": 60,
            "hits": 57
          },
          "after_two_misses": {
            "windows": 2,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 133,
          "hits": 121,
          "rate": 0.9097744360902256
        },
        {
          "year": 2022,
          "windows": 124,
          "hits": 113,
          "rate": 0.9112903225806451
        },
        {
          "year": 2023,
          "windows": 138,
          "hits": 129,
          "rate": 0.9347826086956522
        },
        {
          "year": 2024,
          "windows": 123,
          "hits": 112,
          "rate": 0.9105691056910569
        },
        {
          "year": 2025,
          "windows": 122,
          "hits": 114,
          "rate": 0.9344262295081968
        },
        {
          "year": 2026,
          "windows": 166,
          "hits": 154,
          "rate": 0.927710843373494
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 122,
          "hits": 114,
          "rate": 0.9344262295081968,
          "baseline": 0.9089884717957136,
          "brier": 0.061586383077313185,
          "baselineBrier": 0.061989622275097064,
          "brierSkill": 0.00650494684407632,
          "logLoss": 0.24417754658614582,
          "baselineLogLoss": 0.2467407709412592
        },
        {
          "year": 2026,
          "predictions": 166,
          "hits": 154,
          "rate": 0.927710843373494,
          "baseline": 0.9101579578352639,
          "brier": 0.06704137883972987,
          "baselineBrier": 0.06737077620098254,
          "brierSkill": 0.004889321154175286,
          "logLoss": 0.2592211526865499,
          "baselineLogLoss": 0.2615168651059419
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 1,
        "waitingTail": null,
        "samples": 738,
        "hits": 678,
        "lineRate": 0.9214877523174803,
        "predictedRate": 0.9187727639133899,
        "baseline": 0.9121253645804503,
        "edge": 0.006647399332939563,
        "lower": 0.904875550878989,
        "upper": 0.93066787142034,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 92.2%（743/806），第1/2/3期结束 59/28/13%，当前状态“上一窗命中”历史 678/738。"
      }
    },
    {
      "rank": 6,
      "id": "tail5",
      "label": "尾5",
      "kind": "tail",
      "longTerm": {
        "windows": 809,
        "hits": 739,
        "misses": 70,
        "rate": 0.9134734239802225,
        "baseline": 0.9123544168352413,
        "edge": 0.0011190071449811434,
        "stageShare": {
          "first": 0.6129905277401895,
          "second": 0.2557510148849797,
          "third": 0.13125845737483086
        },
        "stageCounts": {
          "first": 453,
          "second": 189,
          "third": 97
        },
        "hitRuns": {
          "1": 61,
          "2": 58,
          "3": 55,
          "4": 565
        },
        "missRuns": {
          "1": 60,
          "2": 7,
          "3": 2,
          "4": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 733,
            "hits": 673
          },
          "after_one_miss": {
            "windows": 60,
            "hits": 53
          },
          "after_two_misses": {
            "windows": 7,
            "hits": 5
          },
          "after_three_plus_misses": {
            "windows": 3,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 133,
          "hits": 121,
          "rate": 0.9097744360902256
        },
        {
          "year": 2022,
          "windows": 120,
          "hits": 109,
          "rate": 0.9083333333333333
        },
        {
          "year": 2023,
          "windows": 126,
          "hits": 116,
          "rate": 0.9206349206349206
        },
        {
          "year": 2024,
          "windows": 145,
          "hits": 134,
          "rate": 0.9241379310344827
        },
        {
          "year": 2025,
          "windows": 134,
          "hits": 125,
          "rate": 0.9328358208955224
        },
        {
          "year": 2026,
          "windows": 151,
          "hits": 134,
          "rate": 0.8874172185430463
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 134,
          "hits": 125,
          "rate": 0.9328358208955224,
          "baseline": 0.9161733198973884,
          "brier": 0.06330303509526376,
          "baselineBrier": 0.06297023567058806,
          "brierSkill": -0.0052850274599043345,
          "logLoss": 0.25090563649810227,
          "baselineLogLoss": 0.24842401210753579
        },
        {
          "year": 2026,
          "predictions": 151,
          "hits": 134,
          "rate": 0.8874172185430463,
          "baseline": 0.9133653581713106,
          "brier": 0.10101202470659004,
          "baselineBrier": 0.10059501695572678,
          "brierSkill": -0.004145411606688132,
          "logLoss": 0.3588943674259242,
          "baselineLogLoss": 0.3558806839312841
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 5,
        "waitingTail": null,
        "samples": 733,
        "hits": 673,
        "lineRate": 0.9134334118057893,
        "predictedRate": 0.9180194797292375,
        "baseline": 0.9123544168352413,
        "edge": 0.005665062893996153,
        "lower": 0.9042320178421858,
        "upper": 0.9301921015613194,
        "confidence": "接近基准",
        "windowStart": 1463,
        "windowAttempts": 1,
        "reason": "长期 91.3%（739/809），第1/2/3期结束 61/26/13%，当前状态“上一窗命中”历史 673/733。"
      }
    },
    {
      "rank": 7,
      "id": "prob1",
      "label": "概率第1",
      "kind": "probability",
      "longTerm": {
        "windows": 826,
        "hits": 755,
        "misses": 71,
        "rate": 0.914043583535109,
        "baseline": 0.9060180336627223,
        "edge": 0.008025549872386684,
        "stageShare": {
          "first": 0.6211920529801325,
          "second": 0.26225165562913905,
          "third": 0.11655629139072848
        },
        "stageCounts": {
          "first": 469,
          "second": 198,
          "third": 88
        },
        "hitRuns": {
          "1": 64,
          "2": 60,
          "3": 53,
          "4": 578
        },
        "missRuns": {
          "1": 63,
          "2": 6,
          "3": 2
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 750,
            "hits": 687
          },
          "after_one_miss": {
            "windows": 62,
            "hits": 56
          },
          "after_two_misses": {
            "windows": 6,
            "hits": 4
          },
          "after_three_plus_misses": {
            "windows": 2,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 139,
          "hits": 129,
          "rate": 0.9280575539568345
        },
        {
          "year": 2022,
          "windows": 118,
          "hits": 102,
          "rate": 0.864406779661017
        },
        {
          "year": 2023,
          "windows": 134,
          "hits": 123,
          "rate": 0.917910447761194
        },
        {
          "year": 2024,
          "windows": 135,
          "hits": 127,
          "rate": 0.9407407407407408
        },
        {
          "year": 2025,
          "windows": 128,
          "hits": 116,
          "rate": 0.90625
        },
        {
          "year": 2026,
          "windows": 172,
          "hits": 158,
          "rate": 0.9186046511627907
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 128,
          "hits": 116,
          "rate": 0.90625,
          "baseline": 0.9102122232198078,
          "brier": 0.08543966843092761,
          "baselineBrier": 0.08525958796255123,
          "brierSkill": -0.002112143310561976,
          "logLoss": 0.31388911137581565,
          "baselineLogLoss": 0.31151838711345037
        },
        {
          "year": 2026,
          "predictions": 172,
          "hits": 158,
          "rate": 0.9186046511627907,
          "baseline": 0.9064915048113972,
          "brier": 0.07505756562386796,
          "baselineBrier": 0.07544166658337674,
          "brierSkill": 0.005091363657565462,
          "logLoss": 0.28381404311846964,
          "baselineLogLoss": 0.2862926760449192
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 3,
        "waitingTail": null,
        "samples": 750,
        "hits": 687,
        "lineRate": 0.9137623142638805,
        "predictedRate": 0.9159418782925683,
        "baseline": 0.9060180336627223,
        "edge": 0.00992384462984608,
        "lower": 0.9021108192204379,
        "upper": 0.928075610850192,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 91.4%（755/826），第1/2/3期结束 62/26/12%，当前状态“上一窗命中”历史 687/750。"
      }
    },
    {
      "rank": 8,
      "id": "tail7",
      "label": "尾7",
      "kind": "tail",
      "longTerm": {
        "windows": 807,
        "hits": 740,
        "misses": 67,
        "rate": 0.9169764560099133,
        "baseline": 0.9147892623228175,
        "edge": 0.0021871936870957454,
        "stageShare": {
          "first": 0.6,
          "second": 0.26216216216216215,
          "third": 0.13783783783783785
        },
        "stageCounts": {
          "first": 444,
          "second": 194,
          "third": 102
        },
        "hitRuns": {
          "1": 64,
          "2": 56,
          "3": 53,
          "4": 567
        },
        "missRuns": {
          "1": 63,
          "2": 4
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 5
          },
          "after_hit": {
            "windows": 736,
            "hits": 674
          },
          "after_one_miss": {
            "windows": 61,
            "hits": 57
          },
          "after_two_misses": {
            "windows": 4,
            "hits": 4
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 140,
          "hits": 134,
          "rate": 0.9571428571428572
        },
        {
          "year": 2022,
          "windows": 123,
          "hits": 113,
          "rate": 0.9186991869918699
        },
        {
          "year": 2023,
          "windows": 130,
          "hits": 117,
          "rate": 0.9
        },
        {
          "year": 2024,
          "windows": 119,
          "hits": 108,
          "rate": 0.907563025210084
        },
        {
          "year": 2025,
          "windows": 126,
          "hits": 113,
          "rate": 0.8968253968253969
        },
        {
          "year": 2026,
          "windows": 169,
          "hits": 155,
          "rate": 0.9171597633136095
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 126,
          "hits": 113,
          "rate": 0.8968253968253969,
          "baseline": 0.9077100396628711,
          "brier": 0.0931764151749414,
          "baselineBrier": 0.09278985032992174,
          "brierSkill": -0.004166025094826553,
          "logLoss": 0.3360668392717886,
          "baselineLogLoss": 0.3335336314102712
        },
        {
          "year": 2026,
          "predictions": 169,
          "hits": 155,
          "rate": 0.9171597633136095,
          "baseline": 0.9092023965103547,
          "brier": 0.07617426908350876,
          "baselineBrier": 0.07614452244839788,
          "brierSkill": -0.00039066020974831694,
          "logLoss": 0.2870543023815295,
          "baselineLogLoss": 0.28667727359194184
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 7,
        "waitingTail": null,
        "samples": 736,
        "hits": 674,
        "lineRate": 0.9168980619709493,
        "predictedRate": 0.9157909540203955,
        "baseline": 0.9147892623228175,
        "edge": 0.001001691697577911,
        "lower": 0.9017149758388526,
        "upper": 0.9279598350169812,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 91.7%（740/807），第1/2/3期结束 60/26/14%，当前状态“上一窗命中”历史 674/736。"
      }
    },
    {
      "rank": 9,
      "id": "tail8",
      "label": "尾8",
      "kind": "tail",
      "longTerm": {
        "windows": 799,
        "hits": 724,
        "misses": 75,
        "rate": 0.9061326658322904,
        "baseline": 0.8963078059223887,
        "edge": 0.009824859909901673,
        "stageShare": {
          "first": 0.6146408839779005,
          "second": 0.27348066298342544,
          "third": 0.11187845303867404
        },
        "stageCounts": {
          "first": 445,
          "second": 198,
          "third": 81
        },
        "hitRuns": {
          "1": 65,
          "2": 59,
          "3": 55,
          "4": 545
        },
        "missRuns": {
          "1": 65,
          "2": 9,
          "3": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 4
          },
          "after_one_miss": {
            "windows": 65,
            "hits": 57
          },
          "after_two_misses": {
            "windows": 8,
            "hits": 7
          },
          "after_hit": {
            "windows": 719,
            "hits": 655
          },
          "after_three_plus_misses": {
            "windows": 1,
            "hits": 1
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 122,
          "hits": 110,
          "rate": 0.9016393442622951
        },
        {
          "year": 2022,
          "windows": 133,
          "hits": 121,
          "rate": 0.9097744360902256
        },
        {
          "year": 2023,
          "windows": 128,
          "hits": 117,
          "rate": 0.9140625
        },
        {
          "year": 2024,
          "windows": 115,
          "hits": 100,
          "rate": 0.8695652173913043
        },
        {
          "year": 2025,
          "windows": 133,
          "hits": 125,
          "rate": 0.9398496240601504
        },
        {
          "year": 2026,
          "windows": 168,
          "hits": 151,
          "rate": 0.8988095238095238
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 133,
          "hits": 125,
          "rate": 0.9398496240601504,
          "baseline": 0.9014706302007506,
          "brier": 0.057817649524212464,
          "baselineBrier": 0.05806525475336098,
          "brierSkill": 0.004264258035209689,
          "logLoss": 0.23554914489296752,
          "baselineLogLoss": 0.23721553624864292
        },
        {
          "year": 2026,
          "predictions": 168,
          "hits": 151,
          "rate": 0.8988095238095238,
          "baseline": 0.9054485298240221,
          "brier": 0.09149095536351186,
          "baselineBrier": 0.09111877116447074,
          "brierSkill": -0.00408460511796549,
          "logLoss": 0.33098032207546174,
          "baselineLogLoss": 0.32866700689597633
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 8,
        "waitingTail": null,
        "samples": 719,
        "hits": 655,
        "lineRate": 0.9057771220478549,
        "predictedRate": 0.910846471503325,
        "baseline": 0.8963078059223887,
        "edge": 0.014538665580936305,
        "lower": 0.8964430600581536,
        "upper": 0.9236631124688727,
        "confidence": "高于基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 90.6%（724/799），第1/2/3期结束 61/27/11%，当前状态“上一窗命中”历史 655/719。"
      }
    },
    {
      "rank": 10,
      "id": "prob2",
      "label": "概率第2",
      "kind": "probability",
      "longTerm": {
        "windows": 809,
        "hits": 734,
        "misses": 75,
        "rate": 0.907292954264524,
        "baseline": 0.9073192517967172,
        "edge": -0.000026297532193186868,
        "stageShare": {
          "first": 0.6171662125340599,
          "second": 0.2561307901907357,
          "third": 0.12670299727520437
        },
        "stageCounts": {
          "first": 453,
          "second": 188,
          "third": 93
        },
        "hitRuns": {
          "1": 68,
          "2": 63,
          "3": 60,
          "4": 543
        },
        "missRuns": {
          "1": 67,
          "2": 5,
          "3": 2,
          "4": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 728,
            "hits": 661
          },
          "after_one_miss": {
            "windows": 67,
            "hits": 62
          },
          "after_two_misses": {
            "windows": 5,
            "hits": 3
          },
          "after_three_plus_misses": {
            "windows": 3,
            "hits": 2
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 146,
          "hits": 136,
          "rate": 0.9315068493150684
        },
        {
          "year": 2022,
          "windows": 132,
          "hits": 121,
          "rate": 0.9166666666666666
        },
        {
          "year": 2023,
          "windows": 112,
          "hits": 98,
          "rate": 0.875
        },
        {
          "year": 2024,
          "windows": 124,
          "hits": 111,
          "rate": 0.8951612903225806
        },
        {
          "year": 2025,
          "windows": 135,
          "hits": 125,
          "rate": 0.9259259259259259
        },
        {
          "year": 2026,
          "windows": 160,
          "hits": 143,
          "rate": 0.89375
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 135,
          "hits": 125,
          "rate": 0.9259259259259259,
          "baseline": 0.9052640605820418,
          "brier": 0.0687704980568552,
          "baselineBrier": 0.07082162299906035,
          "brierSkill": 0.02896184604852059,
          "logLoss": 0.26510664723892796,
          "baselineLogLoss": 0.27568453305486407
        },
        {
          "year": 2026,
          "predictions": 160,
          "hits": 143,
          "rate": 0.89375,
          "baseline": 0.9096350268864002,
          "brier": 0.09541069998947649,
          "baselineBrier": 0.09431996329256401,
          "brierSkill": -0.01156421884441583,
          "logLoss": 0.3417437850055641,
          "baselineLogLoss": 0.335642536181434
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 0,
        "waitingTail": null,
        "samples": 728,
        "hits": 661,
        "lineRate": 0.9072938945815275,
        "predictedRate": 0.9079490346144794,
        "baseline": 0.9073192517967172,
        "edge": 0.0006297828177621589,
        "lower": 0.8933221660444595,
        "upper": 0.9207797233297841,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 90.7%（734/809），第1/2/3期结束 62/26/13%，当前状态“上一窗命中”历史 661/728。"
      }
    },
    {
      "rank": 11,
      "id": "tail4",
      "label": "尾4",
      "kind": "tail",
      "longTerm": {
        "windows": 779,
        "hits": 707,
        "misses": 72,
        "rate": 0.9075738125802311,
        "baseline": 0.906104136074455,
        "edge": 0.0014696765057761185,
        "stageShare": {
          "first": 0.5898161244695899,
          "second": 0.26025459688826025,
          "third": 0.14992927864214992
        },
        "stageCounts": {
          "first": 417,
          "second": 184,
          "third": 106
        },
        "hitRuns": {
          "1": 68,
          "2": 61,
          "3": 57,
          "4": 521
        },
        "missRuns": {
          "1": 67,
          "2": 5
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 702,
            "hits": 635
          },
          "after_one_miss": {
            "windows": 66,
            "hits": 61
          },
          "after_two_misses": {
            "windows": 5,
            "hits": 5
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 126,
          "hits": 112,
          "rate": 0.8888888888888888
        },
        {
          "year": 2022,
          "windows": 137,
          "hits": 131,
          "rate": 0.9562043795620438
        },
        {
          "year": 2023,
          "windows": 122,
          "hits": 111,
          "rate": 0.9098360655737705
        },
        {
          "year": 2024,
          "windows": 120,
          "hits": 107,
          "rate": 0.8916666666666667
        },
        {
          "year": 2025,
          "windows": 113,
          "hits": 98,
          "rate": 0.8672566371681416
        },
        {
          "year": 2026,
          "windows": 161,
          "hits": 148,
          "rate": 0.9192546583850931
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 113,
          "hits": 98,
          "rate": 0.8672566371681416,
          "baseline": 0.9004328501429397,
          "brier": 0.11685378012735534,
          "baselineBrier": 0.11639761685953307,
          "brierSkill": -0.00391900865438477,
          "logLoss": 0.400904084466745,
          "baselineLogLoss": 0.3981721581666
        },
        {
          "year": 2026,
          "predictions": 161,
          "hits": 148,
          "rate": 0.9192546583850931,
          "baseline": 0.8967289525250441,
          "brier": 0.07461783796416595,
          "baselineBrier": 0.07483842100399214,
          "brierSkill": 0.00294745715993161,
          "logLoss": 0.2829903311900042,
          "baselineLogLoss": 0.2840937744613131
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 4,
        "waitingTail": null,
        "samples": 702,
        "hits": 635,
        "lineRate": 0.9075193128334161,
        "predictedRate": 0.9046404241782109,
        "baseline": 0.906104136074455,
        "edge": -0.0014637118962440576,
        "lower": 0.8894069031232135,
        "upper": 0.91782590281802,
        "confidence": "接近基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 90.8%（707/779），第1/2/3期结束 59/26/15%，当前状态“上一窗命中”历史 635/702。"
      }
    },
    {
      "rank": 12,
      "id": "tail9",
      "label": "尾9",
      "kind": "tail",
      "longTerm": {
        "windows": 826,
        "hits": 744,
        "misses": 82,
        "rate": 0.9007263922518159,
        "baseline": 0.9082880076373938,
        "edge": -0.007561615385577869,
        "stageShare": {
          "first": 0.6411290322580645,
          "second": 0.26344086021505375,
          "third": 0.09543010752688172
        },
        "stageCounts": {
          "first": 477,
          "second": 196,
          "third": 71
        },
        "hitRuns": {
          "1": 76,
          "2": 65,
          "3": 64,
          "4": 539
        },
        "missRuns": {
          "1": 75,
          "2": 6,
          "3": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 739,
            "hits": 664
          },
          "after_one_miss": {
            "windows": 74,
            "hits": 68
          },
          "after_two_misses": {
            "windows": 6,
            "hits": 5
          },
          "after_three_plus_misses": {
            "windows": 1,
            "hits": 1
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 127,
          "hits": 111,
          "rate": 0.8740157480314961
        },
        {
          "year": 2022,
          "windows": 132,
          "hits": 116,
          "rate": 0.8787878787878788
        },
        {
          "year": 2023,
          "windows": 132,
          "hits": 119,
          "rate": 0.9015151515151515
        },
        {
          "year": 2024,
          "windows": 130,
          "hits": 117,
          "rate": 0.9
        },
        {
          "year": 2025,
          "windows": 127,
          "hits": 116,
          "rate": 0.9133858267716536
        },
        {
          "year": 2026,
          "windows": 178,
          "hits": 165,
          "rate": 0.9269662921348315
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 127,
          "hits": 116,
          "rate": 0.9133858267716536,
          "baseline": 0.9114966196971541,
          "brier": 0.07990767459553005,
          "baselineBrier": 0.07921680456666524,
          "brierSkill": -0.008721255958808571,
          "logLoss": 0.2988661056713522,
          "baselineLogLoss": 0.29528283012279144
        },
        {
          "year": 2026,
          "predictions": 178,
          "hits": 165,
          "rate": 0.9269662921348315,
          "baseline": 0.9137744767860592,
          "brier": 0.06860226352757531,
          "baselineBrier": 0.06791347883719412,
          "brierSkill": -0.010142091116144725,
          "logLoss": 0.2667250535564847,
          "baselineLogLoss": 0.2628215196339037
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 9,
        "waitingTail": null,
        "samples": 739,
        "hits": 664,
        "lineRate": 0.9009914021368246,
        "predictedRate": 0.8985768485411547,
        "baseline": 0.9082880076373938,
        "edge": -0.009711159096239097,
        "lower": 0.8833997017496331,
        "upper": 0.9118601713544348,
        "confidence": "接近基准",
        "windowStart": 1463,
        "windowAttempts": 1,
        "reason": "长期 90.1%（744/826），第1/2/3期结束 64/26/10%，当前状态“上一窗命中”历史 664/739。"
      }
    },
    {
      "rank": 13,
      "id": "tail0",
      "label": "尾0",
      "kind": "tail",
      "longTerm": {
        "windows": 696,
        "hits": 604,
        "misses": 92,
        "rate": 0.867816091954023,
        "baseline": 0.8252645080511333,
        "edge": 0.04255158390288971,
        "stageShare": {
          "first": 0.5579470198675497,
          "second": 0.30960264900662254,
          "third": 0.13245033112582782
        },
        "stageCounts": {
          "first": 337,
          "second": 187,
          "third": 80
        },
        "hitRuns": {
          "1": 75,
          "2": 68,
          "3": 56,
          "4": 405
        },
        "missRuns": {
          "1": 74,
          "2": 14,
          "3": 3,
          "4": 1
        },
        "stateCounts": {
          "year_start": {
            "windows": 6,
            "hits": 6
          },
          "after_hit": {
            "windows": 601,
            "hits": 527
          },
          "after_one_miss": {
            "windows": 73,
            "hits": 59
          },
          "after_two_misses": {
            "windows": 12,
            "hits": 9
          },
          "after_three_plus_misses": {
            "windows": 4,
            "hits": 3
          }
        }
      },
      "yearly": [
        {
          "year": 2021,
          "windows": 99,
          "hits": 83,
          "rate": 0.8383838383838383
        },
        {
          "year": 2022,
          "windows": 96,
          "hits": 74,
          "rate": 0.7708333333333334
        },
        {
          "year": 2023,
          "windows": 105,
          "hits": 87,
          "rate": 0.8285714285714286
        },
        {
          "year": 2024,
          "windows": 118,
          "hits": 106,
          "rate": 0.8983050847457628
        },
        {
          "year": 2025,
          "windows": 123,
          "hits": 112,
          "rate": 0.9105691056910569
        },
        {
          "year": 2026,
          "windows": 155,
          "hits": 142,
          "rate": 0.9161290322580645
        }
      ],
      "validation": [
        {
          "year": 2025,
          "predictions": 123,
          "hits": 112,
          "rate": 0.9105691056910569,
          "baseline": 0.8417500016096142,
          "brier": 0.0853614298009695,
          "baselineBrier": 0.0869314765023921,
          "brierSkill": 0.018060738924403186,
          "logLoss": 0.31816149866247784,
          "baselineLogLoss": 0.3245619313413587
        },
        {
          "year": 2026,
          "predictions": 155,
          "hits": 142,
          "rate": 0.9161290322580645,
          "baseline": 0.851668619026523,
          "brier": 0.07986285383679054,
          "baselineBrier": 0.0811823997697322,
          "brierSkill": 0.016254088776439857,
          "logLoss": 0.3020148999598204,
          "baselineLogLoss": 0.30788491761392994
        }
      ],
      "current": {
        "state": "after_hit",
        "stateLabel": "上一窗命中",
        "status": "active",
        "lockedTail": 0,
        "waitingTail": null,
        "samples": 601,
        "hits": 527,
        "lineRate": 0.8660577620406805,
        "predictedRate": 0.8765235994216,
        "baseline": 0.8252645080511333,
        "edge": 0.05125909137046669,
        "lower": 0.8586838671305267,
        "upper": 0.8930106813748458,
        "confidence": "高于基准",
        "windowStart": 1464,
        "windowAttempts": 0,
        "reason": "长期 86.8%（604/696），第1/2/3期结束 56/31/13%，当前状态“上一窗命中”历史 527/601。"
      }
    }
  ]
};
