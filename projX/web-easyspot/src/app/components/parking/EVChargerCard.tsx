import type { EVCharger } from '../../data/parkingTypes';

interface EVChargerCardProps {
  readonly charger: EVCharger;
}

export function EVChargerCard({ charger }: EVChargerCardProps) {
  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'Tesla Supercharger': return 'fa-bolt';
      case 'CCS':               return 'fa-charging-station';
      case 'Type 2':            return 'fa-plug';
      case 'CHAdeMO':           return 'fa-plug-circle-bolt';
      default:                  return 'fa-charging-station';
    }
  };

  const getSpeedColor = (speedKW: number) => {
    if (speedKW >= 100) return 'text-purple-600';
    if (speedKW >= 40)  return 'text-orange-600';
    if (speedKW >= 20)  return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div
      className={`card bg-base-100 border-2 ${
        charger.available ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
      } shadow-sm`}
    >
      <div className="card-body p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <i
                className={`fas ${getConnectorIcon(charger.type)} text-[#7357ec] text-lg`}
                aria-hidden="true"
              ></i>
              <h4 className="font-semibold text-[#2e1c7c] text-sm">
                {charger.type}
              </h4>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <i className="fas fa-gauge-high text-[#5948a6]" aria-hidden="true"></i>
                <span className={`font-semibold ${getSpeedColor(charger.speedKW)}`}>
                  {charger.speed}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <i className="fas fa-euro-sign text-[#5948a6]" aria-hidden="true"></i>
                <span className="text-[#3b3070]">
                  €{charger.price.toFixed(2)}/kWh
                </span>
              </div>
            </div>
          </div>

          <div
            className={`badge badge-sm ${
              charger.available ? 'badge-success' : 'badge-error'
            } gap-1`}
          >
            <i
              className={`fas ${charger.available ? 'fa-circle-check' : 'fa-circle-xmark'}`}
              aria-hidden="true"
            ></i>
            <span className="text-xs">
              {charger.available ? 'Livre' : 'Ocupado'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
