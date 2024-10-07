export const ReferralsEmbed = ({ publicToken }: { publicToken: string }) => {
  return (
    <>
      <iframe
        src={`http://localhost:8888/embed?token=${publicToken}`}
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
        }}
      ></iframe>
    </>
  );
};
