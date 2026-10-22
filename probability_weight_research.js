(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CAISHEN_PROBABILITY_WEIGHT_RESEARCH = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  return {
    "generatedAt": "2026-10-22T15:08:57.844Z",
    "training": "2021-2024",
    "validation": "2025",
    "shadow": "2026",
    "l2": 1,
    "hyperparameters": {
      "fit": "IRLS logistic regression",
      "iterations": 30,
      "featureScaling": "train mean and standard deviation",
      "evaluationRank": "window3 probability descending, then tail ascending",
      "outcome": "tail appears in target period or next two periods"
    },
    "models": {
      "p10": {
        "key": "p10",
        "label": "5 / 10 / 20 / 30 期",
        "windows": [
          5,
          10,
          20,
          30
        ],
        "sampleCount": 9240,
        "next": {
          "weights": [
            0.190077841,
            0.032722978,
            0.03502135,
            -0.048299928,
            0.022778183,
            -0.030000682,
            0.023665911
          ],
          "mean": [
            0.540627706,
            0.53469697,
            0.522819264,
            0.510992063,
            0.085811688,
            0.235
          ],
          "sd": [
            0.235365691,
            0.180444422,
            0.150366097,
            0.146217425,
            0.132928191,
            0.292681475
          ]
        },
        "window3": {
          "weights": [
            2.227474884,
            0.064990799,
            0.116958652,
            -0.273358259,
            0.174873731,
            -0.11341293,
            -0.00982907
          ],
          "mean": [
            0.540627706,
            0.53469697,
            0.522819264,
            0.510992063,
            0.085811688,
            0.235
          ],
          "sd": [
            0.235365691,
            0.180444422,
            0.150366097,
            0.146217425,
            0.132928191,
            0.292681475
          ]
        },
        "evaluation": {
          "2021": {
            "year": 2021,
            "periods": 231,
            "hits": 215,
            "first": 148,
            "second": 45,
            "third": 22,
            "miss": 16,
            "baselineHits": 2068,
            "baselineSamples": 2310,
            "nextBaselineHits": 1268,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 223,
            "window3Top3CoverageHits": 231,
            "rate": 0.9307359307359307,
            "baseline": 0.8952380952380953,
            "nextBaseline": 0.5489177489177489,
            "nextTop3Coverage": 0.9653679653679653,
            "window3Top3Coverage": 1
          },
          "2022": {
            "year": 2022,
            "periods": 231,
            "hits": 211,
            "first": 121,
            "second": 54,
            "third": 36,
            "miss": 20,
            "baselineHits": 2105,
            "baselineSamples": 2310,
            "nextBaselineHits": 1267,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 216,
            "window3Top3CoverageHits": 231,
            "rate": 0.9134199134199135,
            "baseline": 0.9112554112554112,
            "nextBaseline": 0.5484848484848485,
            "nextTop3Coverage": 0.935064935064935,
            "window3Top3Coverage": 1
          },
          "2023": {
            "year": 2023,
            "periods": 231,
            "hits": 208,
            "first": 124,
            "second": 55,
            "third": 29,
            "miss": 23,
            "baselineHits": 2074,
            "baselineSamples": 2310,
            "nextBaselineHits": 1256,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 212,
            "window3Top3CoverageHits": 231,
            "rate": 0.9004329004329005,
            "baseline": 0.8978354978354979,
            "nextBaseline": 0.5437229437229437,
            "nextTop3Coverage": 0.9177489177489178,
            "window3Top3Coverage": 1
          },
          "2024": {
            "year": 2024,
            "periods": 231,
            "hits": 217,
            "first": 134,
            "second": 61,
            "third": 22,
            "miss": 14,
            "baselineHits": 2080,
            "baselineSamples": 2310,
            "nextBaselineHits": 1266,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 220,
            "window3Top3CoverageHits": 231,
            "rate": 0.9393939393939394,
            "baseline": 0.9004329004329005,
            "nextBaseline": 0.548051948051948,
            "nextTop3Coverage": 0.9523809523809523,
            "window3Top3Coverage": 1
          },
          "2025": {
            "year": 2025,
            "periods": 231,
            "hits": 210,
            "first": 130,
            "second": 56,
            "third": 24,
            "miss": 21,
            "baselineHits": 2103,
            "baselineSamples": 2310,
            "nextBaselineHits": 1254,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 221,
            "window3Top3CoverageHits": 231,
            "rate": 0.9090909090909091,
            "baseline": 0.9103896103896104,
            "nextBaseline": 0.5428571428571428,
            "nextTop3Coverage": 0.9567099567099567,
            "window3Top3Coverage": 1
          },
          "2026": {
            "year": 2026,
            "periods": 293,
            "hits": 257,
            "first": 153,
            "second": 71,
            "third": 33,
            "miss": 36,
            "baselineHits": 2645,
            "baselineSamples": 2930,
            "nextBaselineHits": 1604,
            "nextBaselineSamples": 2930,
            "nextTop3CoverageHits": 268,
            "window3Top3CoverageHits": 293,
            "rate": 0.8771331058020477,
            "baseline": 0.9027303754266212,
            "nextBaseline": 0.5474402730375426,
            "nextTop3Coverage": 0.9146757679180887,
            "window3Top3Coverage": 1
          }
        }
      },
      "p57152130": {
        "key": "p57152130",
        "label": "5 / 7 / 15 / 21 / 30 期",
        "windows": [
          5,
          7,
          15,
          21,
          30
        ],
        "sampleCount": 9240,
        "next": {
          "weights": [
            0.19016944,
            0.005473276,
            0.042249598,
            0.081197796,
            -0.140159734,
            0.056029013,
            -0.028523804,
            0.023869738
          ],
          "mean": [
            0.540627706,
            0.538280767,
            0.528643579,
            0.521639868,
            0.510992063,
            0.085811688,
            0.235
          ],
          "sd": [
            0.235365691,
            0.20562007,
            0.159352156,
            0.149255315,
            0.146217425,
            0.132928191,
            0.292681475
          ]
        },
        "window3": {
          "weights": [
            2.230249935,
            -0.036537631,
            0.19786847,
            0.047503262,
            -0.330232804,
            0.21056257,
            -0.11126071,
            -0.011100406
          ],
          "mean": [
            0.540627706,
            0.538280767,
            0.528643579,
            0.521639868,
            0.510992063,
            0.085811688,
            0.235
          ],
          "sd": [
            0.235365691,
            0.20562007,
            0.159352156,
            0.149255315,
            0.146217425,
            0.132928191,
            0.292681475
          ]
        },
        "evaluation": {
          "2021": {
            "year": 2021,
            "periods": 231,
            "hits": 216,
            "first": 140,
            "second": 53,
            "third": 23,
            "miss": 15,
            "baselineHits": 2068,
            "baselineSamples": 2310,
            "nextBaselineHits": 1268,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 223,
            "window3Top3CoverageHits": 231,
            "rate": 0.935064935064935,
            "baseline": 0.8952380952380953,
            "nextBaseline": 0.5489177489177489,
            "nextTop3Coverage": 0.9653679653679653,
            "window3Top3Coverage": 1
          },
          "2022": {
            "year": 2022,
            "periods": 231,
            "hits": 209,
            "first": 126,
            "second": 56,
            "third": 27,
            "miss": 22,
            "baselineHits": 2105,
            "baselineSamples": 2310,
            "nextBaselineHits": 1267,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 220,
            "window3Top3CoverageHits": 231,
            "rate": 0.9047619047619048,
            "baseline": 0.9112554112554112,
            "nextBaseline": 0.5484848484848485,
            "nextTop3Coverage": 0.9523809523809523,
            "window3Top3Coverage": 1
          },
          "2023": {
            "year": 2023,
            "periods": 231,
            "hits": 212,
            "first": 129,
            "second": 58,
            "third": 25,
            "miss": 19,
            "baselineHits": 2074,
            "baselineSamples": 2310,
            "nextBaselineHits": 1256,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 212,
            "window3Top3CoverageHits": 231,
            "rate": 0.9177489177489178,
            "baseline": 0.8978354978354979,
            "nextBaseline": 0.5437229437229437,
            "nextTop3Coverage": 0.9177489177489178,
            "window3Top3Coverage": 1
          },
          "2024": {
            "year": 2024,
            "periods": 231,
            "hits": 218,
            "first": 134,
            "second": 61,
            "third": 23,
            "miss": 13,
            "baselineHits": 2080,
            "baselineSamples": 2310,
            "nextBaselineHits": 1266,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 215,
            "window3Top3CoverageHits": 231,
            "rate": 0.9437229437229437,
            "baseline": 0.9004329004329005,
            "nextBaseline": 0.548051948051948,
            "nextTop3Coverage": 0.9307359307359307,
            "window3Top3Coverage": 1
          },
          "2025": {
            "year": 2025,
            "periods": 231,
            "hits": 208,
            "first": 133,
            "second": 48,
            "third": 27,
            "miss": 23,
            "baselineHits": 2103,
            "baselineSamples": 2310,
            "nextBaselineHits": 1254,
            "nextBaselineSamples": 2310,
            "nextTop3CoverageHits": 221,
            "window3Top3CoverageHits": 230,
            "rate": 0.9004329004329005,
            "baseline": 0.9103896103896104,
            "nextBaseline": 0.5428571428571428,
            "nextTop3Coverage": 0.9567099567099567,
            "window3Top3Coverage": 0.9956709956709957
          },
          "2026": {
            "year": 2026,
            "periods": 293,
            "hits": 265,
            "first": 160,
            "second": 71,
            "third": 34,
            "miss": 28,
            "baselineHits": 2645,
            "baselineSamples": 2930,
            "nextBaselineHits": 1604,
            "nextBaselineSamples": 2930,
            "nextTop3CoverageHits": 268,
            "window3Top3CoverageHits": 293,
            "rate": 0.9044368600682594,
            "baseline": 0.9027303754266212,
            "nextBaseline": 0.5474402730375426,
            "nextTop3Coverage": 0.9146757679180887,
            "window3Top3Coverage": 1
          }
        },
        "promotionEligible": false,
        "conclusion": "研究层面验证段与年度方向不稳定；用户已要求直接切换生产，风险继续跟踪"
      }
    },
    "researchRecommendation": "keep-production",
    "productionModel": "p57152130",
    "decision": "user-approved-production",
    "override": {
      "approvedBy": "user",
      "approvedAt": "2026-10-22",
      "reason": "用户明确要求直接更替到 5 / 7 / 15 / 21 / 30 新方法",
      "productionActivation": {
        "legacyTarget": 296,
        "firstNewTarget": 297,
        "rule": "已保存的296期开奖前快照不改写，新权重从297期第一张未生成快照开始"
      }
    },
    "comparison": {
      "validation2025": {
        "year": 2025,
        "periods": 231,
        "baseHits": 210,
        "challengerHits": 208,
        "baseRate": 0.9090909090909091,
        "challengerRate": 0.9004329004329005,
        "delta": -0.008658008658008658,
        "challengerOnly": 8,
        "baseOnly": 10,
        "pValue": 0.8136638117733084
      },
      "shadow2026": {
        "year": 2026,
        "periods": 293,
        "baseHits": 257,
        "challengerHits": 265,
        "baseRate": 0.8771331058020477,
        "challengerRate": 0.9044368600682594,
        "delta": 0.027303754266211604,
        "challengerOnly": 16,
        "baseOnly": 8,
        "pValue": 0.15304198078836095
      },
      "allYears": {
        "year": "all",
        "periods": 1448,
        "baseHits": 1318,
        "challengerHits": 1328,
        "baseRate": 0.9102209944751382,
        "challengerRate": 0.9171270718232044,
        "delta": 0.006906077348066298,
        "challengerOnly": 52,
        "baseOnly": 42,
        "pValue": 0.35326276451419103
      }
    },
    "annualComparison": [
      {
        "year": 2021,
        "periods": 231,
        "baseHits": 215,
        "challengerHits": 216,
        "baseRate": 0.9307359307359307,
        "challengerRate": 0.935064935064935,
        "delta": 0.004329004329004329,
        "challengerOnly": 7,
        "baseOnly": 6,
        "pValue": 0.9999999989999999
      },
      {
        "year": 2022,
        "periods": 231,
        "baseHits": 211,
        "challengerHits": 209,
        "baseRate": 0.9134199134199135,
        "challengerRate": 0.9047619047619048,
        "delta": -0.008658008658008658,
        "challengerOnly": 7,
        "baseOnly": 9,
        "pValue": 0.8025874586317725
      },
      {
        "year": 2023,
        "periods": 231,
        "baseHits": 208,
        "challengerHits": 212,
        "baseRate": 0.9004329004329005,
        "challengerRate": 0.9177489177489178,
        "delta": 0.017316017316017316,
        "challengerOnly": 8,
        "baseOnly": 4,
        "pValue": 0.3864761481221173
      },
      {
        "year": 2024,
        "periods": 231,
        "baseHits": 217,
        "challengerHits": 218,
        "baseRate": 0.9393939393939394,
        "challengerRate": 0.9437229437229437,
        "delta": 0.004329004329004329,
        "challengerOnly": 6,
        "baseOnly": 5,
        "pValue": 0.9999999989999999
      },
      {
        "year": 2025,
        "periods": 231,
        "baseHits": 210,
        "challengerHits": 208,
        "baseRate": 0.9090909090909091,
        "challengerRate": 0.9004329004329005,
        "delta": -0.008658008658008658,
        "challengerOnly": 8,
        "baseOnly": 10,
        "pValue": 0.8136638117733084
      },
      {
        "year": 2026,
        "periods": 293,
        "baseHits": 257,
        "challengerHits": 265,
        "baseRate": 0.8771331058020477,
        "challengerRate": 0.9044368600682594,
        "delta": 0.027303754266211604,
        "challengerOnly": 16,
        "baseOnly": 8,
        "pValue": 0.15304198078836095
      }
    ]
  };
});
