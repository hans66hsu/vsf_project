(() => {
  const renderPageMath = () => {
    if (!window.katex) {
      console.warn("KaTeX did not load; keeping readable equation fallbacks.");
      return;
    }

    document.querySelectorAll("[data-tex]").forEach((element) => {
      window.katex.render(element.dataset.tex, element, {
        displayMode: element.hasAttribute("data-tex-display"),
        output: "htmlAndMathml",
        strict: "warn",
        throwOnError: false,
        trust: false,
      });
      element.dataset.mathRendered = "true";
    });
  };

  renderPageMath();

  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const pageRegions = [...document.querySelectorAll("main, footer")];

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
    pageRegions.forEach((region) => region.removeAttribute("inert"));
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
    pageRegions.forEach((region) => region.toggleAttribute("inert", willOpen));
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
    const sigma0Input = root.querySelector("[data-bifurcation-sigma0]");
    const sigma0Outputs = [...root.querySelectorAll("[data-bifurcation-sigma0-output]")];
    const fidelityOutputs = [...root.querySelectorAll("[data-bifurcation-fidelity-output]")];
    const sensitivityOutput = root.querySelector("[data-bifurcation-sensitivity-output]");
    const status = root.querySelector("[data-bifurcation-status]");
    const plots = {
      truth: root.querySelector("[data-bifurcation-plot='truth']"),
      sf: root.querySelector("[data-bifurcation-plot='sf']"),
      latent: root.querySelector("[data-bifurcation-plot='latent']"),
      sensitivity: root.querySelector("[data-bifurcation-plot='sensitivity']"),
    };

    if (!fallback || !interactive || !sigma0Input
      || Object.values(plots).some((plot) => !plot)) return;

    const NS = "http://www.w3.org/2000/svg";
    // Appendix toy model. sigma0 is the component standard deviation at t = 0;
    // epsilon_tau = sigma0 exp(-k tau) is the split-time W2 fidelity error.
    const model = {
      T: 1.15,
      tau: 0.42,
      k: 1.4,
      slope: 3.2,
      // The interactive illustration evaluates the posterior branch mean at t = 0.60
      // and the sensitivity comparison at t = 0.72. These are display choices.
      posteriorTime: 0.6,
      sensitivityTime: 0.72,
      // This sigma0 interval keeps the complete linked sensitivity curve inside
      // the paper-style raw linear viewport while retaining the sigma0 = 0.34 reference.
      sigma0Min: 0.27,
      sigma0Max: 1.8,
      fixedProbe: 0.01,
      posteriorXMax: 0.1,
      // At sigma0 = 1.8 the positive/negative component tubes nearly reach
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

    const sigma0SliderMin = Number.parseFloat(sigma0Input.min);
    const sigma0SliderMax = Number.parseFloat(sigma0Input.max);

    const m = (time) => model.slope * Math.max(time - model.tau, 0);
    const sigma = (time, sigma0) => sigma0 * Math.exp(-model.k * time);
    const fidelityError = (sigma0) => sigma(model.tau, sigma0);
    const posteriorMean = (x, time, sigma0) => {
      const spread = sigma(time, sigma0);
      const branchLogit = (x * m(time)) / (spread * spread);
      return Math.tanh(Math.max(-30, Math.min(30, branchLogit)));
    };
    const posteriorTransitionWidth = (sigma0) => (
      sigma(model.posteriorTime, sigma0) ** 2 / m(model.posteriorTime)
    );
    const q = (time) => model.slope + model.k * m(time);
    const sfVelocity = (state, time, sigma0) => {
      const branchLogit = (state * m(time) * Math.exp(2 * model.k * time))
        / (sigma0 * sigma0);
      return -model.k * state
        + q(time) * Math.tanh(Math.max(-30, Math.min(30, branchLogit)));
    };
    const rk4Step = (state, time, step, sigma0) => {
      const k1 = sfVelocity(state, time, sigma0);
      const k2 = sfVelocity(state + (step * k1) / 2, time + step / 2, sigma0);
      const k3 = sfVelocity(state + (step * k2) / 2, time + step / 2, sigma0);
      const k4 = sfVelocity(state + step * k3, time + step, sigma0);
      return state + (step * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    };
    const timeDelta = model.sensitivityTime - model.tau;
    const sensitivityCoefficient = (
      m(model.sensitivityTime) ** 2 * Math.exp(2 * model.k * timeDelta)
    ) / 2;
    const logSensitivityFromFidelity = (epsilon) => (
      -model.k * timeDelta + sensitivityCoefficient / (epsilon * epsilon)
    );
    const logSensitivity = (sigma0) => logSensitivityFromFidelity(fidelityError(sigma0));

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
        { value: model.tau, label: "split" },
        { value: model.T, label: "end" },
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
      }, "physical state");
      add(svg, "text", {
        x: 14,
        y: (branchFrame.top + bottom) / 2,
        class: "plot-label",
        "text-anchor": "middle",
        transform: `rotate(-90 14 ${(branchFrame.top + bottom) / 2})`,
      }, "physical time");

      const layer = add(svg, "g");
      return { ...scales, layer };
    };

    const branchPoints = (sign, start = model.tau, end = model.T, count = 64) => range(start, end, count)
      .map((time) => [sign * m(time), time]);

    const bandPolygon = (center, start, end, sigma0, xScale, tScale, count = 56) => {
      const times = range(start, end, count);
      const upper = times.map((time) => [center(time) + sigma(time, sigma0), time]);
      const lower = [...times].reverse().map((time) => [center(time) - sigma(time, sigma0), time]);
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
      }, "positive future");
      add(layer, "text", {
        x: x(-m(1.04)) - 8,
        y: t(1.04),
        class: "plot-note plot-note--negative",
        "text-anchor": "end",
      }, "negative future");
    };

    const sfProbeTrajectory = (sigma0, count = 128, substeps = 4) => {
      // Integrate the displayed population-optimal field directly from the fixed
      // split-time probe x_tau = +0.01. Odd symmetry gives the negative trajectory.
      const times = range(model.tau, model.T, count);
      const trajectory = [[model.fixedProbe, model.tau]];
      let state = model.fixedProbe;
      let currentTime = model.tau;
      for (let sample = 1; sample < times.length; sample += 1) {
        const targetTime = times[sample];
        const step = (targetTime - currentTime) / substeps;
        for (let substep = 0; substep < substeps; substep += 1) {
          state = rk4Step(state, currentTime, step, sigma0);
          currentTime += step;
        }
        trajectory.push([state, targetTime]);
      }
      return trajectory;
    };

    const targetBranchPoints = (sign) => [
      [0, 0],
      ...branchPoints(sign),
    ];

    const drawBranchPosteriorInset = (layer, sigma0) => {
      const inset = posteriorInset;
      const xLimit = model.posteriorXMax;
      const transitionWidth = posteriorTransitionWidth(sigma0);
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
      }, "posterior branch mean");
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
        posteriorMean(state, model.posteriorTime, sigma0),
      ]);
      add(insetLayer, "path", {
        d: pathFrom(curve, x, y),
        class: "plot-inset-posterior",
      });
    };

    const drawStandardSF = (sigma0) => {
      const probe = model.fixedProbe;
      const positiveTrajectory = sfProbeTrajectory(sigma0);
      const negativeTrajectory = positiveTrajectory.map(([state, time]) => [-state, time]);
      const epsilon = fidelityError(sigma0);
      const description = `The dashed data paths stay fixed. The solid green and red curves solve the population-optimal Standard Streaming Flow equation from fixed split-time states minus and plus ${probe.toFixed(2)}. Initial tube scale sigma zero ${sigma0.toFixed(3)} gives fidelity error epsilon tau ${formatEpsilon(epsilon)}. The inset shows the posterior branch mean.`;
      const { x, t, layer } = setupBranchPlot(
        plots.sf,
        "sf",
        "Fixed target and live Standard Streaming Flow generation",
        description,
      );

      add(layer, "polygon", {
        points: bandPolygon(() => 0, 0, model.tau, sigma0, x, t),
        class: "plot-tube--shared",
      });
      add(layer, "polygon", {
        points: bandPolygon((time) => m(time), model.tau, model.T, sigma0, x, t),
        class: "plot-tube--positive",
      });
      add(layer, "polygon", {
        points: bandPolygon((time) => -m(time), model.tau, model.T, sigma0, x, t),
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

      const calloutOffset = Math.max(9, Math.abs(x(probe) - x(0)) + 5);
      add(layer, "text", {
        x: x(0) - calloutOffset,
        y: t(model.tau) + 9,
        class: "plot-paper-callout",
        "text-anchor": "end",
      }, "negative fixed probe  →");
      add(layer, "text", {
        x: x(0) + calloutOffset,
        y: t(model.tau) + 9,
        class: "plot-paper-callout",
        "text-anchor": "start",
      }, "←  positive fixed probe");
      add(layer, "text", {
        x: x(0),
        y: t(0.68),
        class: "plot-paper-annotation plot-paper-gap",
        "text-anchor": "middle",
      }, `fixed probe gap ${(2 * probe).toFixed(3)}`);
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
      }, "fixed physical-state differences");
      add(layer, "text", {
        x: x(m(0.88) + sigma(0.88, sigma0)) + 5,
        y: t(0.88) - 5,
        class: "plot-tube-label",
      }, "one-standard-deviation tube");

      drawBranchPosteriorInset(layer, sigma0);
    };

    const drawLatent = (selection = "both") => {
      const { x, t, layer } = setupBranchPlot(
        plots.latent,
        "latent",
        "Ideal latent bifurcation",
        "The two futures share the same physical split state, while the sign of latent Z selects the branch-specific velocity field.",
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
      }, "same split state");
      add(layer, "text", {
        x: x(m(0.73)) + 8,
        y: t(0.73),
        class: `plot-note plot-note--latent-positive${positiveClass}`,
      }, "positive latent branch");
      add(layer, "text", {
        x: x(-m(0.73)) - 8,
        y: t(0.73),
        class: `plot-note plot-note--latent-negative${negativeClass}`,
        "text-anchor": "end",
      }, "negative latent branch");
      add(layer, "text", {
        x: x(0), y: t(model.tau) - 9, class: "plot-note", "text-anchor": "middle",
      }, "Z selects the future");
    };

    const drawSensitivity = (sigma0) => {
      const svg = plots.sensitivity;
      svg.replaceChildren();
      const sensitivity = logSensitivity(sigma0);
      const epsilon = fidelityError(sigma0);
      add(svg, "title", { id: "bifurcation-sensitivity-title" }, "Standard Streaming Flow sensitivity versus fidelity error");
      add(svg, "desc", { id: "bifurcation-sensitivity-desc" }, `On raw linear axes, standard Streaming Flow log sensitivity is ${formatSensitivity(sensitivity)} at fidelity error epsilon tau ${formatEpsilon(epsilon)}. A dashed line shows the ideal latent sensitivity. The complete selectable range is visible.`);

      const plotWidth = sensitivityFrame.width - sensitivityFrame.left - sensitivityFrame.right;
      const plotHeight = sensitivityFrame.height - sensitivityFrame.top - sensitivityFrame.bottom;
      const yMin = -2;
      const yMax = 50;
      const epsilonMin = fidelityError(model.sigma0Min);
      const epsilonMax = fidelityError(model.sigma0Max);
      const x = (value) => sensitivityFrame.left
        + ((value - epsilonMin) / (epsilonMax - epsilonMin)) * plotWidth;
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
        { value: epsilonMin, label: epsilonMin.toFixed(2), startpoint: true },
        { value: 0.35, label: "0.35" },
        { value: 0.55, label: "0.55" },
        { value: 0.75, label: "0.75" },
        { value: epsilonMax, label: epsilonMax.toFixed(2), endpoint: true },
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
      }, "fidelity error");
      add(svg, "text", {
        x: 16,
        y: (sensitivityFrame.top + bottom) / 2,
        class: "plot-label plot-sensitivity-axis-label",
        "text-anchor": "middle",
        transform: `rotate(-90 16 ${(sensitivityFrame.top + bottom) / 2})`,
      }, "log physical-state sensitivity");

      const curve = range(epsilonMin, epsilonMax, 260)
        .map((value) => [value, logSensitivityFromFidelity(value)]);
      add(svg, "path", {
        d: pathFrom(curve, x, y),
        class: "plot-curve",
        "clip-path": "url(#sensitivity-plot-clip)",
      });

      const idealLogSensitivity = -model.k * timeDelta;
      add(svg, "line", {
        x1: sensitivityFrame.left,
        y1: y(idealLogSensitivity),
        x2: right,
        y2: y(idealLogSensitivity),
        class: "plot-ideal-baseline",
      });
      add(svg, "text", {
        x: right - 3,
        y: y(idealLogSensitivity) - 5,
        class: "plot-ideal-label",
        "text-anchor": "end",
      }, "ideal latent");

      const markerX = x(epsilon);
      const markerY = y(sensitivity);
      if (epsilon > epsilonMin * 1.001 && epsilon < epsilonMax * 0.999) {
        add(svg, "line", {
          x1: markerX, y1: markerY, x2: markerX, y2: bottom, class: "plot-sensitivity-guide",
        });
      }
      add(svg, "circle", {
        cx: markerX,
        cy: markerY,
        r: 4.5,
        class: "plot-marker",
      });
      add(svg, "text", {
        x: sensitivityFrame.left + 7,
        y: 12,
        class: "plot-sensitivity-range-label",
      }, "complete slider range shown · linear axes");
    };

    const selectedLatent = () => latentInputs.find((input) => input.checked)?.value || "both";

    const updateSigma0 = (announce = false) => {
      const sigma0 = Number.parseFloat(sigma0Input.value);
      const epsilon = fidelityError(sigma0);
      const sensitivity = logSensitivity(sigma0);
      const sigma0Label = sigma0.toFixed(3);
      const epsilonLabel = formatEpsilon(epsilon);
      const sensitivityLabel = formatSensitivity(sensitivity);
      sigma0Outputs.forEach((output) => { output.textContent = sigma0Label; });
      fidelityOutputs.forEach((output) => { output.textContent = epsilonLabel; });
      if (sensitivityOutput) sensitivityOutput.textContent = sensitivityLabel;
      const progress = ((sigma0 - sigma0SliderMin)
        / (sigma0SliderMax - sigma0SliderMin)) * 100;
      sigma0Input.style.setProperty("--range-progress", `${progress.toFixed(1)}%`);
      sigma0Input.setAttribute(
        "aria-valuetext",
        `sigma zero ${sigma0.toFixed(3)}; split-time fidelity error epsilon tau ${epsilon.toFixed(3)}; fixed probe half-width ${model.fixedProbe.toFixed(2)}; linear control`,
      );
      drawStandardSF(sigma0);
      drawSensitivity(sigma0);
      if (announce && status) {
        status.textContent = `Initial tube scale sigma zero ${sigma0.toFixed(3)} gives fidelity error epsilon tau ${epsilon.toFixed(3)} and Standard Streaming Flow log sensitivity ${sensitivity.toFixed(2)}. Probe states remain fixed at minus and plus ${model.fixedProbe.toFixed(2)}.`;
      }
    };

    drawGroundTruth();
    drawLatent(selectedLatent());
    updateSigma0();
    interactive.hidden = false;
    fallback.hidden = true;

    let sigma0AnimationFrame = 0;
    let announcementTimer = 0;
    const announceAfterPause = (update) => {
      window.clearTimeout(announcementTimer);
      announcementTimer = window.setTimeout(() => update(true), 450);
    };
    sigma0Input.addEventListener("input", () => {
      window.cancelAnimationFrame(sigma0AnimationFrame);
      sigma0AnimationFrame = window.requestAnimationFrame(() => updateSigma0());
    });
    sigma0Input.addEventListener("change", () => {
      window.cancelAnimationFrame(sigma0AnimationFrame);
      updateSigma0();
      announceAfterPause(updateSigma0);
    });
    latentInputs.forEach((input) => {
      input.addEventListener("change", () => {
        window.clearTimeout(announcementTimer);
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
