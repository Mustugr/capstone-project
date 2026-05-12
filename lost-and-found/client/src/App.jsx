import AppRoutes from "./routes/AppRoutes";
import DisclaimerModal from "./components/DisclaimerModal";

export default function App() {
  return (
    <>
      <DisclaimerModal />
      <AppRoutes />
    </>
  );
}