(() => {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
  };

  const closeNav = (returnFocus = false) => {
    if (!nav || !navToggle) return;
    const wasOpen = navToggle.getAttribute("aria-expanded") === "true";
    nav.classList.remove("is-open");
    header?.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
    if (returnFocus && wasOpen) navToggle.focus();
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  navToggle?.addEventListener("click", () => {
    const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
    nav?.classList.toggle("is-open", willOpen);
    header?.classList.toggle("is-open", willOpen);
    navToggle.setAttribute("aria-expanded", String(willOpen));
    document.body.classList.toggle("nav-open", willOpen);
    if (willOpen) nav?.querySelector("a")?.focus();
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeNav());
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 780) closeNav();
  }, { passive: true });

  window.addEventListener("load", () => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    target.scrollIntoView({ block: "start" });
    document.documentElement.style.scrollBehavior = previousBehavior;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav(true);
  });

  const tabs = [...document.querySelectorAll("[role='tab'][data-tab]")];

  const activateTab = (tab, shouldFocus = false) => {
    tabs.forEach((item) => {
      const isActive = item === tab;
      const pane = document.getElementById(item.dataset.tab);
      item.setAttribute("aria-selected", String(isActive));
      item.tabIndex = isActive ? 0 : -1;
      if (pane) pane.hidden = !isActive;
    });
    if (shouldFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      activateTab(tabs[nextIndex], true);
    });
  });

  const bifurcationRoot = document.querySelector("[data-bifurcation-demo]");

  const initBifurcationDemo = (root) => {
    const fallback = root.querySelector("[data-bifurcation-fallback]");
    const interactive = root.querySelector("[data-bifurcation-interactive]");
    const epsilonInput = root.querySelector("[data-bifurcation-epsilon]");
    const epsilonOutputs = [...root.querySelectorAll("[data-bifurcation-epsilon-output]")];
    const sensitivityOutput = root.querySelector("[data-bifurcation-sensitivity-output]");
    const gapOutput = root.querySelector("[data-bifurcation-gap-output]");
    const lagOutput = root.querySelector("[data-bifurcation-lag-output]");
    const transitionOutput = root.querySelector("[data-bifurcation-transition-output]");
    const status = root.querySelector("[data-bifurcation-status]");
    const plots = {
      truth: root.querySelector("[data-bifurcation-plot='truth']"),
      sf: root.querySelector("[data-bifurcation-plot='sf']"),
      gap: root.querySelector("[data-bifurcation-plot='gap']"),
      posterior: root.querySelector("[data-bifurcation-plot='posterior']"),
      latent: root.querySelector("[data-bifurcation-plot='latent']"),
      sensitivity: root.querySelector("[data-bifurcation-plot='sensitivity']"),
    };

    if (!fallback || !interactive || !epsilonInput || Object.values(plots).some((plot) => !plot)) return;

    const NS = "http://www.w3.org/2000/svg";
    // Appendix toy model: epsilon is the split-time standard deviation sigma_tau,
    // which is also the W2 fidelity error to the target Dirac law delta_0 at x = 0.
    const model = {
      T: 1.15,
      tau: 0.42,
      k: 1.4,
      slope: 3.2,
      // The source panel evaluates its posterior branch mean at t = 0.60 and its sensitivity
      // comparison at t = 0.72. Keeping these distinct reproduces the paper.
      posteriorTime: 0.6,
      sensitivityTime: 0.72,
      comparisonTime: 0.72,
      // The control extends below the paper-comparable window to expose the
      // inverse-square sensitivity blow-up. The sensitivity panel keeps the
      // paper's raw linear viewport and marks values above it as off-scale.
      epsilonMin: 0.01,
      epsilonMax: 1,
      // The source figure is matched by sigma_0 = 0.34 and delta = 0.01, hence
      // epsilon_tau = sigma_0 exp(-k tau) and delta / epsilon_tau below.
      probeScale: 0.05295247188646401,
      posteriorXMax: 0.1,
      // At epsilon_tau = 1 the positive/negative component tubes nearly reach
      // +/-2.70 at T, so retain a small visual margin around them.
      xMin: -2.9,
      xMax: 2.9,
    };
    const branchFrame = { left: 47, right: 65, top: 18, bottom: 43, width: 360, height: 300 };
    const sensitivityFrame = { left: 56, right: 16, top: 18, bottom: 45, width: 360, height: 300 };
    const posteriorInset = {
      x: 181,
      y: 22,
      width: 112,
      height: 74,
      innerLeft: 195,
      innerRight: 288,
      innerTop: 45,
      innerBottom: 88,
    };
    const latentInputs = [...root.querySelectorAll("[data-bifurcation-latent]")];

    const svgElement = (name, attributes = {}, text = "") => {
      const element = document.createElementNS(NS, name);
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
      if (text) element.textContent = text;
      return element;
    };

    const add = (parent, name, attributes = {}, text = "") => {
      const element = svgElement(name, attributes, text);
      parent.appendChild(element);
      return element;
    };

    const range = (start, end, count) => Array.from(
      { length: count },
      (_, index) => start + ((end - start) * index) / (count - 1),
    );

    const pathFrom = (points, xScale, yScale) => points
      .map(([x, y], index) => `${index ? "L" : "M"}${xScale(x).toFixed(2)},${yScale(y).toFixed(2)}`)
      .join(" ");

    const superscript = (value) => String(value)
      .split("")
      .map((character) => ({
        "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴",
        5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹",
      })[character] || character)
      .join("");

    const scientific = (value, digits = 2) => {
      if (value === 0) return "0";
      const exponent = Math.floor(Math.log10(Math.abs(value)));
      const coefficient = value / (10 ** exponent);
      return `${coefficient.toFixed(digits)} × 10${superscript(exponent)}`;
    };

    const formatEpsilon = (value) => {
      if (value >= 0.1) return value.toFixed(3);
      if (value >= 0.01) return value.toFixed(3);
      return scientific(value);
    };

    const formatSensitivity = (value) => {
      if (Math.abs(value) < 1e4) return value.toFixed(2);
      if (Math.abs(value) < 1e6) {
        return value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return scientific(value);
    };

    const formatTransitionWidth = (value) => (
      value >= 1e-3 ? value.toPrecision(3) : scientific(value)
    );

    const sliderMin = Number.parseFloat(epsilonInput.min);
    const sliderMax = Number.parseFloat(epsilonInput.max);
    const epsilonFromSlider = (sliderValue) => sliderValue;

    const m = (time) => model.slope * Math.max(time - model.tau, 0);
    const sigma = (time, epsilon) => epsilon * Math.exp(-model.k * (time - model.tau));
    const deltaProbe = (epsilon) => model.probeScale * epsilon;
    const posteriorMean = (x, time, epsilon) => {
      const spread = sigma(time, epsilon);
      const branchLogit = (x * m(time)) / (spread * spread);
      return Math.tanh(Math.max(-30, Math.min(30, branchLogit)));
    };
    const posteriorTransitionWidth = (epsilon) => (
      sigma(model.posteriorTime, epsilon) ** 2 / m(model.posteriorTime)
    );
    const normalCdf = (value) => {
      const magnitude = Math.abs(value);
      const weight = 1 / (1 + 0.2316419 * magnitude);
      const density = Math.exp(-(magnitude ** 2) / 2) / Math.sqrt(2 * Math.PI);
      const tail = density * weight * (
        0.319381530 + weight * (
          -0.356563782 + weight * (
            1.781477937 + weight * (-1.821255978 + weight * 1.330274429)
          )
        )
      );
      return value >= 0 ? 1 - tail : tail;
    };
    const sfMarginalCdf = (state, time, epsilon) => {
      const center = m(time);
      const spread = sigma(time, epsilon);
      return 0.5 * normalCdf((state + center) / spread)
        + 0.5 * normalCdf((state - center) / spread);
    };
    const sfQuantile = (probability, time, epsilon) => {
      let lower = model.xMin;
      let upper = model.xMax;
      for (let iteration = 0; iteration < 42; iteration += 1) {
        const midpoint = (lower + upper) / 2;
        if (sfMarginalCdf(midpoint, time, epsilon) < probability) lower = midpoint;
        else upper = midpoint;
      }
      return (lower + upper) / 2;
    };
    const probeCdfRank = normalCdf(model.probeScale);
    const generatedProbeState = (time, epsilon) => (
      sfQuantile(probeCdfRank, time, epsilon)
    );
    const targetGeneratedLag = (epsilon) => (
      Math.max(0, m(model.comparisonTime) - generatedProbeState(model.comparisonTime, epsilon))
    );
    const timeDelta = model.sensitivityTime - model.tau;
    const sensitivityCoefficient = (
      m(model.sensitivityTime) ** 2 * Math.exp(2 * model.k * timeDelta)
    ) / 2;
    const logSensitivity = (epsilon) => (
      -model.k * timeDelta + sensitivityCoefficient / (epsilon * epsilon)
    );
    const idealLogSensitivity = -model.k * timeDelta;

    const scalesForBranchPlot = () => {
      const plotWidth = branchFrame.width - branchFrame.left - branchFrame.right;
      const plotHeight = branchFrame.height - branchFrame.top - branchFrame.bottom;
      return {
        x: (value) => branchFrame.left
          + ((value - model.xMin) / (model.xMax - model.xMin)) * plotWidth,
        t: (value) => branchFrame.top + (value / model.T) * plotHeight,
      };
    };

    const setupBranchPlot = (svg, id, title, description) => {
      svg.replaceChildren();
      add(svg, "title", { id: `bifurcation-${id}-title` }, title);
      add(svg, "desc", { id: `bifurcation-${id}-desc` }, description);
      const scales = scalesForBranchPlot();
      const bottom = branchFrame.height - branchFrame.bottom;
      const right = branchFrame.width - branchFrame.right;

      [-2, 0, 2].forEach((tick) => {
        add(svg, "line", {
          x1: scales.x(tick), y1: branchFrame.top, x2: scales.x(tick), y2: bottom,
          class: "plot-grid",
        });
        add(svg, "line", {
          x1: scales.x(tick), y1: bottom, x2: scales.x(tick), y2: bottom + 4,
          class: "plot-axis",
        });
        add(svg, "text", {
          x: scales.x(tick), y: bottom + 17, class: "plot-tick", "text-anchor": "middle",
        }, String(tick).replace("-", "−"));
      });

      [
        { value: 0, label: "0" },
        { value: model.tau, label: "τ" },
        { value: model.T, label: "T" },
      ].forEach(({ value, label }) => {
        add(svg, "line", {
          x1: branchFrame.left - 4, y1: scales.t(value), x2: branchFrame.left, y2: scales.t(value),
          class: "plot-axis",
        });
        add(svg, "text", {
          x: branchFrame.left - 8,
          y: scales.t(value) + 3,
          class: "plot-tick",
          "text-anchor": "end",
        }, label);
      });

      add(svg, "line", {
        x1: branchFrame.left, y1: scales.t(model.tau), x2: right, y2: scales.t(model.tau),
        class: "plot-guide plot-guide--tau",
      });
      add(svg, "line", {
        x1: branchFrame.left, y1: branchFrame.top, x2: branchFrame.left, y2: bottom,
        class: "plot-axis",
      });
      add(svg, "line", {
        x1: branchFrame.left, y1: bottom, x2: right, y2: bottom,
        class: "plot-axis",
      });
      add(svg, "text", {
        x: (branchFrame.left + right) / 2,
        y: branchFrame.height - 12,
        class: "plot-label",
        "text-anchor": "middle",
      }, "physical state x");
      add(svg, "text", {
        x: 14,
        y: (branchFrame.top + bottom) / 2,
        class: "plot-label",
        "text-anchor": "middle",
        transform: `rotate(-90 14 ${(branchFrame.top + bottom) / 2})`,
      }, "time t");

      const layer = add(svg, "g");
      return { ...scales, layer };
    };

    const branchPoints = (sign, start = model.tau, end = model.T, count = 64) => range(start, end, count)
      .map((time) => [sign * m(time), time]);

    const bandPolygon = (center, start, end, epsilon, xScale, tScale, count = 56) => {
      const times = range(start, end, count);
      const upper = times.map((time) => [center(time) + sigma(time, epsilon), time]);
      const lower = [...times].reverse().map((time) => [center(time) - sigma(time, epsilon), time]);
      return [...upper, ...lower]
        .map(([x, time]) => `${xScale(x).toFixed(2)},${tScale(time).toFixed(2)}`)
        .join(" ");
    };

    const drawGroundTruth = () => {
      const { x, t, layer } = setupBranchPlot(
        plots.truth,
        "truth",
        "Ground-truth bifurcation",
        "Two trajectories share physical state zero until time tau, then separate into positive and negative futures.",
      );
      add(layer, "path", {
        d: pathFrom([[0, 0], [0, model.tau]], x, t),
        class: "plot-stem",
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(1), x, t),
        class: "plot-branch--positive",
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(-1), x, t),
        class: "plot-branch--negative",
      });
      add(layer, "circle", { cx: x(0), cy: t(model.tau), r: 4, class: "plot-split" });
      add(layer, "text", {
        x: x(0) + 8, y: t(0.2), class: "plot-note",
      }, "same physical past");
      add(layer, "text", {
        x: x(0) + 8, y: t(model.tau) + 15, class: "plot-note",
      }, "future unresolved");
      add(layer, "text", {
        x: x(m(1.04)) + 8, y: t(1.04), class: "plot-note plot-note--positive",
      }, "B = +1");
      add(layer, "text", {
        x: x(-m(1.04)) - 8,
        y: t(1.04),
        class: "plot-note plot-note--negative",
        "text-anchor": "end",
      }, "B = −1");
    };

    const sfProbeTrajectory = (xAtTau, epsilon, count = 96) => {
      // In one dimension, characteristics of this smooth marginal flow preserve
      // CDF rank. Numerically inverting the analytic Gaussian-mixture CDF avoids stiffness as
      // epsilon approaches zero while drawing the field's exact characteristic.
      const probability = normalCdf(xAtTau / epsilon);
      return range(model.tau, model.T, count).map((time, index) => [
        index === 0 ? xAtTau : sfQuantile(probability, time, epsilon),
        time,
      ]);
    };

    const targetBranchPoints = (sign) => [
      [0, 0],
      ...branchPoints(sign),
    ];

    const drawBranchPosteriorInset = (layer, epsilon) => {
      const inset = posteriorInset;
      const xLimit = model.posteriorXMax;
      const transitionWidth = posteriorTransitionWidth(epsilon);
      const x = (state) => inset.innerLeft
        + ((state + xLimit) / (2 * xLimit)) * (inset.innerRight - inset.innerLeft);
      const y = (value) => inset.innerTop
        + ((1.05 - value) / 2.1) * (inset.innerBottom - inset.innerTop);

      const insetLayer = add(layer, "g", { class: "plot-posterior-inset" });
      add(insetLayer, "rect", {
        x: inset.x,
        y: inset.y,
        width: inset.width,
        height: inset.height,
        class: "plot-inset-frame",
      });
      add(insetLayer, "text", {
        x: (inset.x + inset.width / 2),
        y: inset.y + 14,
        class: "plot-inset-title",
        "text-anchor": "middle",
      }, "E[B | Xₜ = x]");
      add(insetLayer, "line", {
        x1: inset.innerLeft,
        y1: y(0),
        x2: inset.innerRight,
        y2: y(0),
        class: "plot-inset-guide",
      });
      add(insetLayer, "line", {
        x1: x(0),
        y1: inset.innerTop,
        x2: x(0),
        y2: inset.innerBottom,
        class: "plot-inset-guide",
      });
      add(insetLayer, "line", {
        x1: inset.innerLeft,
        y1: inset.innerTop,
        x2: inset.innerLeft,
        y2: inset.innerBottom,
        class: "plot-inset-axis",
      });
      add(insetLayer, "line", {
        x1: inset.innerLeft,
        y1: inset.innerBottom,
        x2: inset.innerRight,
        y2: inset.innerBottom,
        class: "plot-inset-axis",
      });
      [-1, 0, 1].forEach((tick) => {
        add(insetLayer, "text", {
          x: inset.innerLeft - 4,
          y: y(tick) + 2.5,
          class: "plot-inset-tick",
          "text-anchor": "end",
        }, String(tick).replace("-", "−"));
      });

      const adaptiveStates = [-8, -4, -2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 4, 8]
        .map((multiple) => multiple * transitionWidth)
        .filter((state) => Math.abs(state) < xLimit);
      const curveStates = [...range(-xLimit, xLimit, 151), ...adaptiveStates]
        .sort((first, second) => first - second)
        .filter((state, index, states) => index === 0 || state !== states[index - 1]);
      const curve = curveStates.map((state) => [
        state,
        posteriorMean(state, model.posteriorTime, epsilon),
      ]);
      add(insetLayer, "path", {
        d: pathFrom(curve, x, y),
        class: "plot-inset-posterior",
      });
    };

    const drawStandardSF = (epsilon) => {
      const probe = deltaProbe(epsilon);
      const positiveTrajectory = sfProbeTrajectory(probe, epsilon);
      const negativeTrajectory = sfProbeTrajectory(-probe, epsilon);
      const lag = targetGeneratedLag(epsilon);
      const description = `The dashed ground-truth paths stay fixed: blue is the negative branch and orange is the positive branch. The exact Standard Streaming Flow characteristics are green for the negative matched probe and red for the positive matched probe. At split-time component scale ${formatEpsilon(epsilon)}, their per-branch gap from the target at time ${model.comparisonTime.toFixed(2)} is ${formatEpsilon(lag)}. As epsilon tau approaches zero, these fixed-rank probes converge to the targets while the posterior branch mean becomes step-like.`;
      const { x, t, layer } = setupBranchPlot(
        plots.sf,
        "sf",
        "Fixed target and live Standard Streaming Flow generation",
        description,
      );

      add(layer, "polygon", {
        points: bandPolygon(() => 0, 0, model.tau, epsilon, x, t),
        class: "plot-tube--shared",
      });
      add(layer, "polygon", {
        points: bandPolygon((time) => m(time), model.tau, model.T, epsilon, x, t),
        class: "plot-tube--positive",
      });
      add(layer, "polygon", {
        points: bandPolygon((time) => -m(time), model.tau, model.T, epsilon, x, t),
        class: "plot-tube--negative",
      });

      add(layer, "path", {
        d: pathFrom(targetBranchPoints(-1), x, t),
        class: "plot-paper-target plot-paper-target--negative",
        "data-series": "fixed-target-negative",
      });
      add(layer, "path", {
        d: pathFrom(targetBranchPoints(1), x, t),
        class: "plot-paper-target plot-paper-target--positive",
        "data-series": "fixed-target-positive",
      });

      add(layer, "path", {
        d: pathFrom(positiveTrajectory, x, t),
        class: "plot-sf-characteristic plot-sf-characteristic--positive",
        "data-series": "sf-characteristic-positive",
      });
      add(layer, "path", {
        d: pathFrom(negativeTrajectory, x, t),
        class: "plot-sf-characteristic plot-sf-characteristic--negative",
        "data-series": "sf-characteristic-negative",
      });

      add(layer, "text", {
        x: x(0) - 9,
        y: t(model.tau) + 9,
        class: "plot-paper-callout",
        "text-anchor": "end",
      }, "xτ = −δₚ  →");
      add(layer, "text", {
        x: x(0) + 9,
        y: t(model.tau) + 9,
        class: "plot-paper-callout",
        "text-anchor": "start",
      }, "←  xτ = +δₚ");
      add(layer, "text", {
        x: x(0),
        y: t(0.68),
        class: "plot-paper-annotation plot-paper-gap",
        "text-anchor": "middle",
      }, `matched probe gap 2δₚ = ${formatEpsilon(2 * probe)}`);
      add(layer, "text", {
        x: x(0),
        y: t(0.97),
        class: "plot-paper-annotation plot-paper-explanation",
        "text-anchor": "middle",
      }, "branch identity is stored in");
      add(layer, "text", {
        x: x(0),
        y: t(1.035),
        class: "plot-paper-annotation plot-paper-explanation",
        "text-anchor": "middle",
      }, "small physical-state differences");
      add(layer, "text", {
        x: x(m(0.88) + sigma(0.88, epsilon)) + 5,
        y: t(0.88) - 5,
        class: "plot-tube-label",
      }, "component tube ±σₜ");

      drawBranchPosteriorInset(layer, epsilon);
    };

    const drawGapMagnifier = (epsilon) => {
      const svg = plots.gap;
      const gap = 2 * deltaProbe(epsilon);
      svg.replaceChildren();
      add(svg, "title", { id: "bifurcation-gap-title" }, "Magnified Standard Streaming Flow probe gap");
      add(svg, "desc", { id: "bifurcation-gap-desc" }, `A not-to-scale view of split-time probe states x tau equals minus and plus delta probe. Their physical gap is ${formatEpsilon(gap)}.`);

      const left = 24;
      const right = 236;
      const center = (left + right) / 2;
      const displayPortion = (epsilon - model.epsilonMin) / (model.epsilonMax - model.epsilonMin);
      const halfSeparation = 10 + 51 * displayPortion;
      const negative = center - halfSeparation;
      const positive = center + halfSeparation;
      const baseline = 61;
      add(svg, "line", { x1: left, y1: baseline, x2: right, y2: baseline, class: "plot-axis" });
      add(svg, "line", { x1: center, y1: baseline - 8, x2: center, y2: baseline + 8, class: "plot-guide" });
      add(svg, "text", { x: center, y: baseline + 21, class: "plot-tick", "text-anchor": "middle" }, "0");
      add(svg, "line", { x1: negative, y1: 34, x2: positive, y2: 34, class: "plot-gap-line" });
      [negative, positive].forEach((position) => {
        add(svg, "line", { x1: position, y1: 29, x2: position, y2: 39, class: "plot-gap-line" });
      });
      add(svg, "text", { x: center, y: 24, class: "plot-label", "text-anchor": "middle" }, `2δₚ = ${formatEpsilon(gap)}`);
      add(svg, "circle", { cx: negative, cy: baseline, r: 5, class: "plot-gap--negative" });
      add(svg, "circle", { cx: positive, cy: baseline, r: 5, class: "plot-gap--positive" });
      const labelsNeedSpace = halfSeparation < 34;
      add(svg, "text", {
        x: labelsNeedSpace ? center - 7 : negative,
        y: 82,
        class: "plot-tick",
        "text-anchor": labelsNeedSpace ? "end" : "middle",
      }, "xτ = −δₚ");
      add(svg, "text", {
        x: labelsNeedSpace ? center + 7 : positive,
        y: 82,
        class: "plot-tick",
        "text-anchor": labelsNeedSpace ? "start" : "middle",
      }, "xτ = +δₚ");
      add(svg, "text", { x: center, y: 105, class: "plot-tick", "text-anchor": "middle" }, "display-scaled gap · not physical scale");
    };

    const drawPosterior = (epsilon) => {
      const svg = plots.posterior;
      const frame = { left: 32, right: 10, top: 9, bottom: 25, width: 260, height: 118 };
      const xLimit = model.posteriorXMax;
      const transitionWidth = posteriorTransitionWidth(epsilon);
      const plotWidth = frame.width - frame.left - frame.right;
      const plotHeight = frame.height - frame.top - frame.bottom;
      const x = (value) => frame.left + ((value + xLimit) / (2 * xLimit)) * plotWidth;
      const y = (value) => frame.top + ((1.08 - value) / 2.16) * plotHeight;
      const bottom = frame.height - frame.bottom;
      const right = frame.width - frame.right;

      svg.replaceChildren();
      add(svg, "title", { id: "bifurcation-posterior-title" }, "Standard Streaming Flow branch posterior");
      add(svg, "desc", { id: "bifurcation-posterior-desc" }, `At the paper's posterior-mean time ${model.posteriorTime.toFixed(2)}, the exact conditional branch mean is a hyperbolic tangent with characteristic transition scale ${formatTransitionWidth(transitionWidth)}. It sharpens as the tube error shrinks.`);

      const visibleWidth = Math.min(xLimit, transitionWidth);
      add(svg, "rect", {
        x: x(-visibleWidth),
        y: frame.top,
        width: Math.max(0, x(visibleWidth) - x(-visibleWidth)),
        height: plotHeight,
        class: "plot-posterior-band",
      });
      [-1, 0, 1].forEach((tick) => {
        add(svg, "line", { x1: frame.left, y1: y(tick), x2: right, y2: y(tick), class: tick === 0 ? "plot-axis" : "plot-guide" });
        add(svg, "text", { x: frame.left - 5, y: y(tick) + 3, class: "plot-tick", "text-anchor": "end" }, String(tick).replace("-", "−"));
      });
      add(svg, "line", { x1: x(0), y1: frame.top, x2: x(0), y2: bottom, class: "plot-guide" });
      [-xLimit, 0, xLimit].forEach((tick) => {
        add(svg, "line", { x1: x(tick), y1: bottom, x2: x(tick), y2: bottom + 3, class: "plot-axis" });
        const label = tick === 0 ? "0" : `${tick < 0 ? "−" : "+"}${xLimit.toFixed(1)}`;
        add(svg, "text", { x: x(tick), y: bottom + 13, class: "plot-tick", "text-anchor": "middle" }, label);
      });
      add(svg, "line", { x1: frame.left, y1: frame.top, x2: frame.left, y2: bottom, class: "plot-axis" });
      add(svg, "line", { x1: frame.left, y1: bottom, x2: right, y2: bottom, class: "plot-axis" });
      const adaptiveStates = [-8, -4, -2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 4, 8]
        .map((multiple) => multiple * transitionWidth)
        .filter((state) => Math.abs(state) < xLimit);
      const curveStates = [...range(-xLimit, xLimit, 181), ...adaptiveStates]
        .sort((first, second) => first - second)
        .filter((state, index, states) => index === 0 || state !== states[index - 1]);
      const curve = curveStates
        .map((state) => [state, posteriorMean(state, model.posteriorTime, epsilon)]);
      add(svg, "path", { d: pathFrom(curve, x, y), class: "plot-posterior" });
      add(svg, "text", { x: right - 2, y: frame.top + 10, class: "plot-label", "text-anchor": "end" }, "E[B | X = x]");
    };

    const drawLatent = (selection = "both") => {
      const { x, t, layer } = setupBranchPlot(
        plots.latent,
        "latent",
        "Ideal latent bifurcation",
        "The two futures share the same physical split state, while the sign of latent z selects the branch-specific velocity field.",
      );
      const positiveClass = selection === "negative" ? " is-muted" : "";
      const negativeClass = selection === "positive" ? " is-muted" : "";

      add(layer, "path", {
        d: pathFrom([[0, 0], [0, model.tau]], x, t),
        class: "plot-stem",
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(1), x, t),
        class: `plot-latent-branch plot-latent-branch--positive${positiveClass}`,
      });
      add(layer, "path", {
        d: pathFrom(branchPoints(-1), x, t),
        class: `plot-latent-branch plot-latent-branch--negative${negativeClass}`,
      });
      add(layer, "circle", { cx: x(0), cy: t(model.tau), r: 4, class: "plot-split" });
      add(layer, "text", {
        x: x(0) + 8, y: t(0.2), class: "plot-note",
      }, "same physical state x = 0");
      add(layer, "text", {
        x: x(m(0.73)) + 8,
        y: t(0.73),
        class: `plot-note plot-note--latent-positive${positiveClass}`,
      }, "z ≥ 0 → b(z) = +1");
      add(layer, "text", {
        x: x(-m(0.73)) - 8,
        y: t(0.73),
        class: `plot-note plot-note--latent-negative${negativeClass}`,
        "text-anchor": "end",
      }, "z < 0 → b(z) = −1");
      add(layer, "text", {
        x: x(0), y: t(model.tau) - 9, class: "plot-note", "text-anchor": "middle",
      }, "z selects the future");
    };

    const drawSensitivity = (epsilon) => {
      const svg = plots.sensitivity;
      svg.replaceChildren();
      add(svg, "title", { id: "bifurcation-sensitivity-title" }, "Physical-state sensitivity versus tube error");
      add(svg, "desc", { id: "bifurcation-sensitivity-desc" }, `On raw linear axes, the standard Streaming Flow log sensitivity is ${formatSensitivity(logSensitivity(epsilon))} at fidelity error ${formatEpsilon(epsilon)}. The blue curve follows the appendix inverse-square law, a linked blue marker follows the control, and the orange ideal-latent sensitivity remains constant. Values above 50 are clipped at the top of the paper-scale viewport and reported exactly.`);

      const plotWidth = sensitivityFrame.width - sensitivityFrame.left - sensitivityFrame.right;
      const plotHeight = sensitivityFrame.height - sensitivityFrame.top - sensitivityFrame.bottom;
      const yMin = -2;
      const yMax = 50;
      const x = (value) => sensitivityFrame.left
        + ((value - model.epsilonMin) / (model.epsilonMax - model.epsilonMin)) * plotWidth;
      const y = (value) => sensitivityFrame.top
        + ((yMax - value) / (yMax - yMin)) * plotHeight;
      const bottom = sensitivityFrame.height - sensitivityFrame.bottom;
      const right = sensitivityFrame.width - sensitivityFrame.right;
      const definitions = add(svg, "defs");
      const plotClip = add(definitions, "clipPath", { id: "sensitivity-plot-clip" });
      add(plotClip, "rect", {
        x: sensitivityFrame.left,
        y: sensitivityFrame.top,
        width: plotWidth,
        height: plotHeight,
      });
      const arrowhead = add(definitions, "marker", {
        id: "sensitivity-arrowhead",
        viewBox: "0 0 6 6",
        refX: 5.4,
        refY: 3,
        markerWidth: 5,
        markerHeight: 5,
        orient: "auto",
      });
      add(arrowhead, "path", { d: "M0,0 L6,3 L0,6 Z", class: "plot-sensitivity-arrowhead" });

      [
        { value: 0, label: "0" },
        { value: 10, label: "10" },
        { value: 20, label: "20" },
        { value: 30, label: "30" },
        { value: 40, label: "40" },
        { value: 50, label: "50" },
      ].forEach(({ value, label }) => {
        add(svg, "line", {
          x1: sensitivityFrame.left - 4, y1: y(value), x2: sensitivityFrame.left, y2: y(value), class: "plot-axis",
        });
        add(svg, "text", {
          x: sensitivityFrame.left - 8,
          y: y(value) + 3,
          class: "plot-tick plot-sensitivity-tick",
          "text-anchor": "end",
        }, label);
      });
      const epsilonTicks = [
        { value: model.epsilonMin, label: model.epsilonMin.toFixed(2), startpoint: true },
        { value: 0.2, label: "0.2" },
        { value: 0.4, label: "0.4" },
        { value: 0.6, label: "0.6" },
        { value: 0.8, label: "0.8" },
        { value: model.epsilonMax, label: model.epsilonMax.toFixed(1), endpoint: true },
      ];
      epsilonTicks.forEach(({ value: tick, label, endpoint = false, startpoint = false }) => {
        add(svg, "line", {
          x1: x(tick), y1: bottom, x2: x(tick), y2: bottom + 4, class: "plot-axis",
        });
        add(svg, "text", {
          x: x(tick) + (startpoint ? 1 : (endpoint ? -1 : 0)),
          y: bottom + 17,
          class: "plot-tick plot-sensitivity-tick",
          "text-anchor": startpoint ? "start" : (endpoint ? "end" : "middle"),
        }, label);
      });
      add(svg, "line", {
        x1: sensitivityFrame.left, y1: sensitivityFrame.top, x2: sensitivityFrame.left, y2: bottom,
        class: "plot-axis",
      });
      add(svg, "line", {
        x1: sensitivityFrame.left, y1: bottom, x2: right, y2: bottom, class: "plot-axis",
      });
      add(svg, "text", {
        x: (sensitivityFrame.left + right) / 2,
        y: sensitivityFrame.height - 12,
        class: "plot-label plot-sensitivity-axis-label",
        "text-anchor": "middle",
      }, "standard-SF fidelity error ετ");
      add(svg, "text", {
        x: 16,
        y: (sensitivityFrame.top + bottom) / 2,
        class: "plot-label plot-sensitivity-axis-label",
        "text-anchor": "middle",
        transform: `rotate(-90 16 ${(sensitivityFrame.top + bottom) / 2})`,
      }, "log physical-state sensitivity · log J");

      const curve = range(model.epsilonMin, model.epsilonMax, 220)
        .map((value) => [value, logSensitivity(value)]);
      add(svg, "path", {
        d: pathFrom(curve, x, y),
        class: "plot-curve",
        "clip-path": "url(#sensitivity-plot-clip)",
      });
      add(svg, "line", {
        x1: x(model.epsilonMin),
        y1: y(idealLogSensitivity),
        x2: x(model.epsilonMax),
        y2: y(idealLogSensitivity),
        class: "plot-ideal",
      });

      add(svg, "line", { x1: 231, y1: 31, x2: 253, y2: 31, class: "plot-curve plot-sensitivity-key-line" });
      add(svg, "text", { x: 260, y: 34, class: "plot-sensitivity-legend" }, "standard SF");
      add(svg, "line", { x1: 231, y1: 47, x2: 253, y2: 47, class: "plot-ideal plot-sensitivity-key-line" });
      add(svg, "text", { x: 260, y: 50, class: "plot-sensitivity-legend" }, "ideal latent");

      const arrowTarget = 0.2;
      add(svg, "text", {
        x: 205, y: 76, class: "plot-sensitivity-arrow-label", "text-anchor": "middle",
      }, "better fidelity");
      add(svg, "line", {
        x1: 208,
        y1: 82,
        x2: x(arrowTarget) + 3,
        y2: y(logSensitivity(arrowTarget)) - 2,
        class: "plot-sensitivity-arrow",
        "marker-end": "url(#sensitivity-arrowhead)",
      });

      add(svg, "text", { x: 158, y: 158, class: "plot-sensitivity-formula" }, "log Jˢᶠ = −kΔt + C / ετ²");
      add(svg, "text", { x: 181, y: 181, class: "plot-sensitivity-formula" }, "log Jⁱᵈᵉᵃˡ = −kΔt");

      const sensitivity = logSensitivity(epsilon);
      const markerX = x(epsilon);
      const isAboveViewport = sensitivity > yMax;
      const markerY = isAboveViewport ? sensitivityFrame.top + 5 : y(sensitivity);
      if (epsilon > model.epsilonMin * 1.001 && epsilon < model.epsilonMax * 0.999) {
        add(svg, "line", {
          x1: markerX, y1: markerY, x2: markerX, y2: bottom, class: "plot-sensitivity-guide",
        });
      }
      add(svg, "circle", {
        cx: markerX,
        cy: markerY,
        r: 4.5,
        class: `plot-marker${isAboveViewport ? " plot-marker--overflow" : ""}`,
      });
      add(svg, "text", {
        x: sensitivityFrame.left + 7,
        y: 12,
        class: `plot-sensitivity-overflow-label${isAboveViewport ? " is-active" : ""}`,
      }, isAboveViewport
        ? `↑ off scale · log J = ${formatSensitivity(sensitivity)}`
        : `ετ ≲ 0.1455: log J continues above 50`);
    };

    const selectedLatent = () => latentInputs.find((input) => input.checked)?.value || "both";

    const updateFromSlider = (announce = false) => {
      const sliderValue = Number.parseFloat(epsilonInput.value);
      const epsilon = epsilonFromSlider(sliderValue);
      const sensitivity = logSensitivity(epsilon);
      const lag = targetGeneratedLag(epsilon);
      const epsilonLabel = formatEpsilon(epsilon);
      const sensitivityLabel = formatSensitivity(sensitivity);
      epsilonOutputs.forEach((output) => { output.textContent = epsilonLabel; });
      if (sensitivityOutput) sensitivityOutput.textContent = sensitivityLabel;
      if (gapOutput) gapOutput.textContent = formatEpsilon(2 * deltaProbe(epsilon));
      if (lagOutput) lagOutput.textContent = formatEpsilon(lag);
      if (transitionOutput) transitionOutput.textContent = formatTransitionWidth(posteriorTransitionWidth(epsilon));
      const progress = ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100;
      epsilonInput.style.setProperty("--range-progress", `${progress.toFixed(1)}%`);
      epsilonInput.setAttribute(
        "aria-valuetext",
        `epsilon tau ${epsilon.toExponential(2)}; split-time component scale and fidelity error; linear control`,
      );
      drawStandardSF(epsilon);
      drawGapMagnifier(epsilon);
      drawPosterior(epsilon);
      drawSensitivity(epsilon);
      if (announce && status) {
        status.textContent = `The ground-truth target remains fixed. Generated component tube scale ${epsilon.toExponential(2)}. Solid-to-dashed gap at time ${model.comparisonTime.toFixed(2)} is ${lag.toExponential(2)}. Physical matched-probe gap ${(2 * deltaProbe(epsilon)).toExponential(2)}. Branch-posterior characteristic transition scale ${posteriorTransitionWidth(epsilon).toExponential(2)}. Standard Streaming Flow log sensitivity ${sensitivity.toExponential(2)}.`;
      }
    };

    drawGroundTruth();
    drawLatent(selectedLatent());
    updateFromSlider();
    interactive.hidden = false;
    fallback.hidden = true;

    let animationFrame = 0;
    epsilonInput.addEventListener("input", () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => updateFromSlider());
    });
    epsilonInput.addEventListener("change", () => updateFromSlider(true));
    latentInputs.forEach((input) => {
      input.addEventListener("change", () => {
        drawLatent(selectedLatent());
        if (status) {
          const label = input.value === "both" ? "both latent branches" : `the ${input.value} latent branch`;
          status.textContent = `Highlighting ${label}.`;
        }
      });
    });
  };

  if (bifurcationRoot) {
    try {
      initBifurcationDemo(bifurcationRoot);
    } catch (error) {
      console.error("The interactive bifurcation figure could not be initialized.", error);
    }
  }

  const copyButton = document.querySelector("[data-copy-citation]");
  const copyStatus = document.querySelector("[data-copy-status]");
  const citation = document.getElementById("bibtex");

  const legacyCopy = (text) => {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  };

  copyButton?.addEventListener("click", async () => {
    if (!citation) return;
    const label = copyButton.querySelector("span");
    let copied = false;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(citation.textContent.trim());
        copied = true;
      } else {
        copied = legacyCopy(citation.textContent.trim());
      }
    } catch {
      copied = legacyCopy(citation.textContent.trim());
    }

    if (!label) return;
    const original = label.textContent;
    label.textContent = copied ? "Copied" : "Select text";
    if (copyStatus) {
      copyStatus.textContent = copied
        ? "BibTeX citation copied to the clipboard."
        : "Copy failed. Select the citation text manually.";
    }
    window.setTimeout(() => {
      label.textContent = original;
      if (copyStatus) copyStatus.textContent = "";
    }, 1800);
  });
})();
