import { TruckAssignmentClient } from "./TruckAssignment";
import { TruckAssignmentData } from "./TruckAssignment";


export function TruckView({ truckAssignmentData }: { truckAssignmentData: TruckAssignmentData }) {
  <div>
    <TruckAssignmentClient truckAssignmentData={truckAssignmentData}/>
  </div>;
}