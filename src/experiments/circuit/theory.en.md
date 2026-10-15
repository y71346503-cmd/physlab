## Current, voltage, resistance

Electric current $I$ is the charge passing through a cross-section per second, in amperes (A). Voltage $U$ between two points is the work done by the field per unit charge, in volts (V). For a metal conductor at constant temperature the current is proportional to the voltage — **Ohm's law for a section of a circuit**:

$$I = \frac{U}{R},$$

where $R$ is the resistance in ohms (Ω).

## A real source

A battery has an electromotive force (EMF) $\varepsilon$ and an internal resistance $r$. **Ohm's law for a complete circuit**:

$$I = \frac{\varepsilon}{R + r}.$$

The voltage at the terminals is lower than the EMF when current flows:

$$U = \varepsilon - Ir.$$

## Series and parallel connection

| | Series | Parallel |
|---|---|---|
| Current | the same: $I = I_1 = I_2$ | adds up: $I = I_1 + I_2$ |
| Voltage | adds up: $U = U_1 + U_2$ | the same: $U = U_1 = U_2$ |
| Resistance | $R = R_1 + R_2$ | $\dfrac{1}{R} = \dfrac{1}{R_1} + \dfrac{1}{R_2}$ |

In the mixed circuit, element 1 is in series with the parallel pair R2, R3: $R = R_1 + \dfrac{R_2 R_3}{R_2 + R_3}$.

## Measuring instruments

An **ammeter** is connected in series with the element whose current it measures; a **voltmeter** is connected in parallel with it. In the simulation both meters are ideal: the ammeter has zero resistance, the voltmeter infinite. Each meter switches to the smallest range that fits the reading; read the value to the nearest division. The instrument error is half a division.

## Power and the lamp

The power released in an element is

$$P = UI = I^2R = \frac{U^2}{R}.$$

A filament lamp is **not** an ohmic element. Its tungsten filament heats to about 2500 K, and the resistance of tungsten grows with temperature (roughly as $T^{1.2}$). The cold lamp has about 1/13 of its hot resistance. The simulation finds the filament temperature from the balance between electric power and radiated power $P \propto T^4 - T_0^4$; that is why the I–V curve of the lamp bends.

## How the lab works

For a resistor, $I = \dfrac{1}{R}\,U$: the I–V graph is a straight line through the origin. Fit $I = kU + b$ by least squares and get $R = 1/k$ with its uncertainty. For the lamp the points do not lie on a straight line.

## How the circuit is solved

The simulation uses the method of node potentials: for every junction the sum of currents is zero (Kirchhoff's first law), and the current in each resistor follows from Ohm's law. This works for any arrangement of resistors, not just these four.

## Assumptions of the model

- Wires have no resistance; meters are ideal.
- Resistors do not heat up (their resistance is constant); only the lamp filament heats.
- The lamp reaches its steady temperature instantly.
