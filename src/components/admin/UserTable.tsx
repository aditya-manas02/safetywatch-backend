import { Button } from "@/components/ui/button";

export default function UserTable({ users, onView }: any) {
  return (
    <div className="overflow-x-auto border border-gray-700 rounded-lg bg-gray-900">
      <table className="w-full text-gray-200">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Roles</th>
            <th className="p-3 text-left">Joined</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u: any) => (
            <tr key={u._id} className="border-t border-gray-700 hover:bg-gray-800">
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.roles?.join(", ")}</td>
              <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="p-3">
                <Button size="sm" onClick={() => onView(u)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
